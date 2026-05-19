const BASE = process.env.WISE_BASE_URL || "https://bibliotheek-accept8.wise.oclc.org/restapi";
const BRANCH_ID = process.env.WISE_BRANCH_ID || "1000";
const DEFAULT_PERSPECTIVE_ID = "3682";
const DEFAULT_SCOPE = "anything";

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
  if (!text(value)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function appendRepeatedParam(url, key, values) {
  return asArray(values).reduce((nextUrl, value) => appendParam(nextUrl, key, value), url);
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

function yearFacet(value) {
  const year = text(value);
  if (!/^\d{4}$/.test(year)) return "";
  return `publicationYear:${year}-01-01T00:00:00Z`;
}

function quotedFacet(field, value) {
  const clean = text(value);
  if (!field || !clean) return "";
  return `${field}:${clean}`;
}

export default async function handler(req, res) {
  const {
    q = "",
    title = "",
    author = "",
    subject = "",
    series = "",
    isbn = "",
    year = "",
    genreCode = "",
    mediumTypeCode = "",
    languageCode = "",
    branchId = "",
    audienceCode = "",
    targetAudienceCode = "",
    available = "",
    page = "1",
    limit = "20",
    sort = "",
    perspectiveId = DEFAULT_PERSPECTIVE_ID,
    facetFilter = [],
  } = req.query;

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.max(Math.min(Number(limit) || 20, 50), 1);
  const offset = (pageNumber - 1) * limitNumber;

  const termCandidates = [
    { value: q, scope: DEFAULT_SCOPE },
    { value: title, scope: "title" },
    { value: author, scope: "author" },
    { value: subject, scope: "subject" },
    { value: series, scope: "series" },
    { value: isbn, scope: DEFAULT_SCOPE },
  ].filter((item) => text(item.value));

  const primary = termCandidates[0] || { value: "", scope: DEFAULT_SCOPE };

  const filters = [
    ...asArray(facetFilter).map(text).filter(Boolean),
    yearFacet(year),
    quotedFacet("genreCode", genreCode),
    quotedFacet("mediumTypeCode", mediumTypeCode),
    quotedFacet("languageCode", languageCode),
    quotedFacet("branchId", branchId),
    quotedFacet("audienceCode", audienceCode),
    quotedFacet("targetAudienceCode", targetAudienceCode),
  ].filter(Boolean);

  if (!text(primary.value) && !filters.length && available !== "true") {
    return res.status(200).json({
      query: req.query,
      response: {
        offset,
        limit: limitNumber,
        total: 0,
        items: [],
        facets: [],
        sortkeys: [],
      },
      debug: { calls: [] },
    });
  }

  let url =
    `${BASE}/branch/${BRANCH_ID}/perspective/${encodeURIComponent(
      perspectiveId || DEFAULT_PERSPECTIVE_ID
    )}/search` +
    `?returnType=default` +
    `&offset=${offset}` +
    `&limit=${limitNumber}` +
    `&searchScope=${encodeURIComponent(primary.scope || DEFAULT_SCOPE)}`;

  if (text(primary.value)) url = appendParam(url, "term", primary.value);
  if (text(sort)) url = appendParam(url, "sort", sort);
  if (available === "true") url = appendParam(url, "filterAvailableTitles", "true");

  url = appendRepeatedParam(url, "facetFilter", filters);

  const searchCall = await fetchSafe(url);

  return res.status(searchCall.ok ? 200 : searchCall.status || 500).json({
    query: req.query,
    response: searchCall.body,
    debug: {
      calls: [searchCall],
    },
  });
}
