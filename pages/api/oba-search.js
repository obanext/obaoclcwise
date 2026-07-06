import { mapWiseSearchToObaFull } from "../../mapping/mapWiseSearchToObaFull";

const BASE = "https://bibliotheek-accept1.wise.oclc.org/restapi";
const BRANCH_ID = "1000";
const DEFAULT_PERSPECTIVE_ID = "3682";
const DEFAULT_SCOPE = "anything";

const searchHeaders = {
  Accept: "application/json",
  wise_key: process.env.WISE_KEY,
};

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

function isNumericId(value) {
  return /^\d+$/.test(text(value));
}

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

function extractPerspectives(body) {
  return asArray(body?.perspective);
}

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

function extractChildTitleId(item) {
  const id =
    item?.childTitleList?.[0]?.childTitleId ||
    item?.title?.childTitleList?.[0]?.childTitleId ||
    item?.childTitleId ||
    item?.title?.childTitleId ||
    "";

  return isNumericId(id) ? text(id) : "";
}

function extractSourceId(item) {
  return text(item?.id || item?.title?.id || item?.frbrkey || item?.title?.frbrkey || "");
}

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

function appendParam(url, key, value) {
  if (value === undefined || value === null || value === "") return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function appendRepeatedParam(url, key, values) {
  return asArray(values).reduce((nextUrl, value) => appendParam(nextUrl, key, value), url);
}

function normalizeSearchItem(item) {
  const detailId = extractChildTitleId(item);

  if (!detailId) return null;

  return {
    id: detailId,
    sourceId: extractSourceId(item),
    resolvedDetailId: detailId,
    title: {
      ...item,
      id: detailId,
    },
  };
}

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
    sort = "",
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
      selectedSort: text(sort),
      selectedFacetFilters: asArray(facetFilter),
      searchResponse: {},
      allOclc: {
        perspectiveResponse: perspectiveCall.body,
        titlesummaryResponse: {},
        debug: { calls: [perspectiveCall] },
      },
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

  titleSummaryUrl = appendParam(titleSummaryUrl, "sort", sort);
  titleSummaryUrl = appendRepeatedParam(titleSummaryUrl, "facetFilter", facetFilter);

  const searchCall = await fetchSafe(titleSummaryUrl);
  const searchItems = extractSearchItems(searchCall.body);

  const titles = searchItems.map(normalizeSearchItem).filter(Boolean);
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
    selectedSort: text(sort),
    selectedFacetFilters: asArray(facetFilter),
    searchResponse: searchCall.body,
    allOclc: {
      perspectiveResponse: perspectiveCall.body,
      titlesummaryResponse: searchCall.body,
      debug: { calls: [perspectiveCall, searchCall] },
    },
    resolvedItems: searchItems.map((item) => ({
      sourceId: extractSourceId(item),
      childTitleId: extractChildTitleId(item),
      detailId: extractChildTitleId(item),
      usable: isNumericId(extractChildTitleId(item)),
    })),
    debug: {
      calls: [perspectiveCall, searchCall],
    },
  };

  const mapped = mapWiseSearchToObaFull(raw);
  return res.status(200).json({ raw, mapped });
}
