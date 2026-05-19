const BASE = process.env.WISE_BASE_URL || "https://bibliotheek-accept8.wise.oclc.org/restapi";
const BRANCH_ID = process.env.WISE_BRANCH_ID || "1000";
const DEFAULT_PERSPECTIVE_ID = process.env.WISE_DEFAULT_PERSPECTIVE_ID || "3682";
const DEFAULT_LIMIT = 20;

const headers = {
  Accept: "application/json",
  wise_key: process.env.WISE_SEARCH_KEY,
};

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

function appendParam(url, key, value) {
  const clean = text(value);
  if (!clean) return url;
  return `${url}&${encodeURIComponent(key)}=${encodeURIComponent(clean)}`;
}

function appendRepeatedParam(url, key, values) {
  return asArray(values).reduce((nextUrl, value) => appendParam(nextUrl, key, value), url);
}

function yearFacet(value) {
  const year = text(value);
  if (!/^\d{4}$/.test(year)) return "";
  return `publicationYear:${year}-01-01T00:00:00Z`;
}

function facet(field, value) {
  const clean = text(value);
  if (!field || !clean) return "";
  return `${field}:${clean}`;
}

function getPrimarySearch(query) {
  const candidates = [
    { value: query.q, scope: "anything" },
    { value: query.title, scope: "title" },
    { value: query.author, scope: "author" },
    { value: query.subject, scope: "subject" },
    { value: query.series, scope: "series" },
    { value: query.isbn, scope: "anything" },
    { value: query.issn, scope: "anything" },
    { value: query.publisher, scope: "anything" },
    { value: query.content, scope: "anything" },
    { value: query.placementCode, scope: "anything" },
  ];

  return candidates.find((candidate) => text(candidate.value)) || {
    value: "",
    scope: "anything",
  };
}

async function fetchSafe(url) {
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

export default async function handler(req, res) {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.max(Math.min(Number(req.query.limit) || DEFAULT_LIMIT, 50), 1);
  const offset = (page - 1) * limit;
  const perspectiveId = text(req.query.perspectiveId) || DEFAULT_PERSPECTIVE_ID;
  const primary = getPrimarySearch(req.query);

  const filters = [
    ...asArray(req.query.facetFilter).map(text).filter(Boolean),
    yearFacet(req.query.year),
    facet("genreCode", req.query.genreCode),
    facet("mediumTypeCode", req.query.mediumTypeCode),
    facet("languageCode", req.query.languageCode),
    facet("branchId", req.query.branchId),
    facet("audienceCode", req.query.audienceCode),
    facet("targetAudienceCode", req.query.targetAudienceCode),
    facet("fictionNonfictionCode", req.query.fictionNonfictionCode),
  ].filter(Boolean);

  const hasSearch = text(primary.value) || filters.length || req.query.available === "true";

  if (!hasSearch) {
    return res.status(200).json({
      query: req.query,
      response: {
        offset,
        limit,
        total: 0,
        items: [],
        facets: [],
        sortkeys: [],
      },
      debug: {
        calls: [],
        note: "No search submitted because all fields were empty.",
      },
    });
  }

  let url =
    `${BASE}/branch/${encodeURIComponent(BRANCH_ID)}` +
    `/perspective/${encodeURIComponent(perspectiveId)}` +
    `/search?returnType=default` +
    `&offset=${offset}` +
    `&limit=${limit}` +
    `&searchScope=${encodeURIComponent(primary.scope)}`;

  if (text(primary.value)) url = appendParam(url, "term", primary.value);
  if (text(req.query.sort)) url = appendParam(url, "sort", req.query.sort);
  if (req.query.available === "true") url = appendParam(url, "filterAvailableTitles", "true");

  url = appendRepeatedParam(url, "facetFilter", filters);

  const searchCall = await fetchSafe(url);

  return res.status(searchCall.ok ? 200 : searchCall.status || 500).json({
    query: req.query,
    response: searchCall.body,
    debug: {
      calls: [searchCall],
      primary,
      filters,
    },
  });
}
