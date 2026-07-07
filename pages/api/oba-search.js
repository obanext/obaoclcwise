import { mapWiseSearchToObaFull } from "../../mapping/mapWiseSearchToObaFull";

const BASE = "https://bibliotheek-accept1.wise.oclc.org/restapi";
const BRANCH_ID = "1000";
const DEFAULT_PERSPECTIVE_ID = "3682";
const DEFAULT_SCOPE = "anything";

const searchHeaders = {
  Accept: "application/json",
  wise_key: process.env.WISE_KEY,
};

// Normalize fields that may be returned by OCLC as either a single value or an array.
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

// Convert optional request/API values to safe strings.
const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

// Validate ids before they are used as detail-page ids.
function isNumericId(value) {
  return /^\d+$/.test(text(value));
}

// Fetch OCLC JSON while preserving status/body for the visible API-call debug panel.
async function fetchSafe(url, headers = searchHeaders) {
  try {
    const response = await fetch(url, { headers });
    const bodyText = await response.text();

    let body = null;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      body = bodyText || null;
    }

    return {
      url,
      status: response.status,
      ok: response.ok,
      body,
    };
  } catch (error) {
    return {
      url,
      status: 500,
      ok: false,
      body: null,
      error: error.message,
    };
  }
}

// Read perspective definitions from /clienttype/default/perspective.
function extractPerspectives(body) {
  return asArray(body?.perspective);
}

// Read result items from the OCLC titlesummary response.
// Multiple names are kept because WISE/OCLC responses can differ by endpoint/configuration.
function extractSearchItems(body) {
  if (!body || typeof body !== "object") return [];

  return asArray(
    body.titles ||
      body.title ||
      body.items ||
      body.results ||
      body.result ||
      body.content ||
      body.documents ||
      body.titleSummaries ||
      body.summaries ||
      []
  );
}

// Resolve the numeric title id used by the mockup detail page.
// The titlesummary result often carries it in childTitleList[0].childTitleId.
function extractChildTitleId(item) {
  const id =
    item?.childTitleList?.[0]?.childTitleId ||
    item?.title?.childTitleList?.[0]?.childTitleId ||
    item?.childTitleId ||
    item?.title?.childTitleId ||
    "";

  return isNumericId(id) ? text(id) : "";
}

// Keep the OCLC/FRBR source id for evidence/debug and mapped metadata.
function extractSourceId(item) {
  return text(item?.id || item?.title?.id || item?.frbrkey || item?.title?.frbrkey || "");
}

// Read the total result count from the titlesummary response.
function extractTotal(body, fallback) {
  if (!body || typeof body !== "object") return fallback;

  return (
    body.total ||
    body.totalElements ||
    body.count ||
    body.numFound ||
    body.totalResults ||
    body.numberOfResults ||
    body.resultCount ||
    fallback
  );
}

// Append a query parameter without changing existing endpoint parameters.
function appendParam(url, key, value) {
  if (value === undefined || value === null || value === "") return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

// Append repeated query parameters such as facetFilter.
function appendRepeatedParam(url, key, values) {
  return asArray(values).reduce((nextUrl, value) => appendParam(nextUrl, key, value), url);
}

// Merge the search summary with the matching discovery-title response.
// Search-specific fields remain available when the detail response omits them.
function mergeTitleData(summary = {}, discovery = {}) {
  const hasArrayValues = (value) => Array.isArray(value) && value.length > 0;

  return {
    ...discovery,
    ...summary,
    imageUrls: { ...(discovery.imageUrls || {}), ...(summary.imageUrls || {}) },
    author: summary.author || discovery.author,
    media: summary.media || discovery.media,
    language: hasArrayValues(summary.language) ? summary.language : discovery.language,
    isbn: hasArrayValues(summary.isbn) ? summary.isbn : discovery.isbn,
    ppn: hasArrayValues(discovery.ppn) ? discovery.ppn : summary.ppn,
    genre: hasArrayValues(summary.genre) ? summary.genre : discovery.genre,
    subjects: hasArrayValues(discovery.subjects) ? discovery.subjects : summary.subjects,
    collaborators: hasArrayValues(discovery.collaborators)
      ? discovery.collaborators
      : summary.collaborators,
    childTitleList: hasArrayValues(summary.childTitleList)
      ? summary.childTitleList
      : discovery.childTitleList,
    titleSeries: hasArrayValues(discovery.titleSeries)
      ? discovery.titleSeries
      : summary.titleSeries,
  };
}

// Convert one OCLC titlesummary item and its discovery-title response
// to the source shape consumed by the search mapper.
function normalizeSearchItem(item, discoveryTitle = {}) {
  const detailId = extractChildTitleId(item);

  if (!detailId) return null;

  return {
    id: detailId,
    sourceId: extractSourceId(item),
    resolvedDetailId: detailId,
    titleSummary: item,
    discoveryTitle,
    title: {
      ...mergeTitleData(item, discoveryTitle),
      id: detailId,
    },
  };
}

// IST search API.
// Purpose: fetch perspective, titlesummary and discovery-title evidence, then produce mapped OBA JSON-contract output.
export default async function handler(req, res) {
  const {
    q = "",
    page = "1",
    limit = "20",
    suggest = "",
    perspectiveId = DEFAULT_PERSPECTIVE_ID,
    searchScope = DEFAULT_SCOPE,
    facetFilter = [],
    filterAvailableTitles = "false",
  } = req.query;

  const query = String(q || "").trim();

  if (suggest === "1") {
    return res.status(200).json({
      suggestions: [],
      debug: { calls: [] },
    });
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.max(Math.min(Number(limit) || 20, 50), 1);
  const offset = (pageNumber - 1) * limitNumber;

  const perspectiveUrl = `${BASE}/branch/${BRANCH_ID}/clienttype/default/perspective`;
  const perspectiveCall = await fetchSafe(perspectiveUrl);
  const perspectives = extractPerspectives(perspectiveCall.body);

  if (!query) {
    const raw = {
      query,
      page: pageNumber,
      limit: limitNumber,
      total: 0,
      ids: [],
      titles: [],
      suggestions: [],
      perspectives,
      selectedPerspectiveId: String(perspectiveId || DEFAULT_PERSPECTIVE_ID),
      selectedSearchScope: String(searchScope || DEFAULT_SCOPE),
      selectedSort: "",
      selectedFacetFilters: asArray(facetFilter),
      searchResponse: {},
      resolvedItems: [],
      debug: {
        calls: [perspectiveCall],
      },
    };

    const mapped = mapWiseSearchToObaFull(raw);
    return res.status(200).json({ raw, mapped });
  }

  let titleSummaryUrl =
    `${BASE}/branch/${BRANCH_ID}/perspective/${encodeURIComponent(
      perspectiveId || DEFAULT_PERSPECTIVE_ID
    )}/titlesummary` +
    `?returnType=default` +
    `&term=${encodeURIComponent(query)}` +
    `&offset=${offset}` +
    `&limit=${limitNumber}` +
    `&searchScope=${encodeURIComponent(searchScope || DEFAULT_SCOPE)}` +
    `&filterAvailableTitles=${encodeURIComponent(filterAvailableTitles)}` +
    `&enableMultiSelectFaceting=true`;

  titleSummaryUrl = appendRepeatedParam(titleSummaryUrl, "facetFilter", facetFilter);

  const searchCall = await fetchSafe(titleSummaryUrl);
  const searchItems = extractSearchItems(searchCall.body);
  const baseTitles = searchItems.map((item) => normalizeSearchItem(item)).filter(Boolean);
  const uniqueIds = [...new Set(baseTitles.map((entry) => entry.id).filter(isNumericId))];

  // Enrich only the visible result page. These calls add bibliographic fields
  // that are not part of titlesummary, such as imprint, collation, PPN and subjects.
  const discoveryCalls = await Promise.all(
    uniqueIds.map((id) => fetchSafe(`${BASE}/discovery/title/${encodeURIComponent(id)}`))
  );
  const discoveryById = new Map(
    discoveryCalls.map((call, index) => [uniqueIds[index], call?.body || {}])
  );

  const titles = searchItems
    .map((item) => {
      const detailId = extractChildTitleId(item);
      return normalizeSearchItem(item, discoveryById.get(detailId) || {});
    })
    .filter(Boolean);
  const ids = titles.map((entry) => entry.id).filter(isNumericId);
  const total = extractTotal(searchCall.body, ids.length);

  const raw = {
    query,
    page: pageNumber,
    limit: limitNumber,
    total,
    ids,
    titles,
    suggestions: [],
    perspectives,
    selectedPerspectiveId: String(perspectiveId || DEFAULT_PERSPECTIVE_ID),
    selectedSearchScope: String(searchScope || DEFAULT_SCOPE),
    selectedSort: "",
    selectedFacetFilters: asArray(facetFilter),
    searchResponse: searchCall.body,
    discoveryTitleResponses: discoveryCalls.map((call, index) => ({
      id: uniqueIds[index],
      url: call.url,
      status: call.status,
      body: call.body,
    })),
    resolvedItems: searchItems.map((item) => ({
      sourceId: extractSourceId(item),
      childTitleId: extractChildTitleId(item),
      detailId: extractChildTitleId(item),
      usable: isNumericId(extractChildTitleId(item)),
    })),
    debug: {
      calls: [perspectiveCall, searchCall, ...discoveryCalls],
    },
  };

  const mapped = mapWiseSearchToObaFull(raw);
  return res.status(200).json({ raw, mapped });
}
