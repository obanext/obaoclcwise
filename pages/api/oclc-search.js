const BASE = process.env.WISE_BASE_URL || "https://bibliotheek-accept1.wise.oclc.org/restapi";
const BRANCH_ID = process.env.WISE_BRANCH_ID || "1000";
const CLIENT_TYPE = process.env.WISE_CLIENT_TYPE || "default";
const DEFAULT_PERSPECTIVE_ID = process.env.WISE_DEFAULT_PERSPECTIVE_ID || "3682";
const DEFAULT_SCOPE = "anything";
const DEFAULT_SORT = "2910";

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

function appendParam(url, key, value) {
  if (value === undefined || value === null || value === "") return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function appendRepeatedParam(url, key, values) {
  return asArray(values).reduce((nextUrl, value) => appendParam(nextUrl, key, value), url);
}

function extractItems(body) {
  if (!body || typeof body !== "object") return [];
  return asArray(
    body.items ||
      body.titles ||
      body.title ||
      body.results ||
      body.result ||
      body.content ||
      body.documents ||
      body.titleSummaries ||
      body.summaries ||
      []
  );
}

function extractChildTitleId(item = {}) {
  const id =
    item?.childTitleList?.[0]?.childTitleId ||
    item?.title?.childTitleList?.[0]?.childTitleId ||
    item?.childTitleId ||
    item?.title?.childTitleId ||
    "";

  return isNumericId(id) ? text(id) : "";
}

function extractSourceId(item = {}) {
  return text(item?.id || item?.title?.id || item?.frbrkey || item?.title?.frbrkey || "");
}

function firstText(...values) {
  return values.map(text).find(Boolean) || "";
}

function normalizePerspectives(perspectiveBody = {}) {
  return asArray(perspectiveBody?.perspective)
    .slice()
    .sort((a, b) => Number(a?.sortIndex ?? 0) - Number(b?.sortIndex ?? 0))
    .map((perspective) => ({
      id: text(perspective?.id),
      label: firstText(perspective?.labelText, perspective?.labelKey, perspective?.id),
      labelKey: text(perspective?.labelKey),
      backend: text(perspective?.backend),
      sortIndex: perspective?.sortIndex ?? null,
      links: asArray(perspective?.links).map((link) => ({
        rel: text(link?.rel),
        href: text(link?.href),
        raw: link,
      })),
      searchScopes: asArray(perspective?.searchScopes)
        .slice()
        .sort((a, b) => Number(a?.sortIndex ?? 0) - Number(b?.sortIndex ?? 0))
        .map((scope) => ({
          id: text(scope?.id),
          value: firstText(scope?.labelText, scope?.labelKey, scope?.id),
          label: firstText(scope?.labelText, scope?.labelKey, scope?.id),
          labelKey: text(scope?.labelKey),
          sortIndex: scope?.sortIndex ?? null,
          links: asArray(scope?.links).map((link) => ({
            rel: text(link?.rel),
            href: text(link?.href),
            raw: link,
          })),
          raw: scope,
        })),
      sortings: asArray(perspective?.sortings)
        .slice()
        .sort((a, b) => Number(a?.sortIndex ?? 0) - Number(b?.sortIndex ?? 0))
        .map((sorting) => ({
          id: text(sorting?.id),
          label: firstText(sorting?.labelText, sorting?.labelKey, sorting?.id),
          labelKey: text(sorting?.labelKey),
          asc: Boolean(sorting?.sortAsc),
          desc: Boolean(sorting?.sortDesc),
          sortIndex: sorting?.sortIndex ?? null,
          raw: sorting,
        })),
      raw: perspective,
    }));
}

function normalizeSortkeys(searchBody = {}, selectedPerspective = {}) {
  const source = asArray(searchBody?.sortkeys).length
    ? asArray(searchBody?.sortkeys)
    : asArray(selectedPerspective?.sortings);

  return source.map((sort, index) => ({
    id: text(sort?.id),
    label: firstText(sort?.label, sort?.labelText, sort?.labelKey, sort?.id),
    labelKey: text(sort?.labelKey || sort?.label),
    asc: Boolean(sort?.asc ?? sort?.sortAsc),
    desc: Boolean(sort?.desc ?? sort?.sortDesc),
    sortIndex: sort?.sortIndex ?? index,
    raw: sort,
  }));
}

function normalizeFacets(searchBody = {}) {
  return asArray(
    searchBody?.facets ||
      searchBody?.facet ||
      searchBody?.filters ||
      searchBody?.filter ||
      searchBody?.refinements ||
      searchBody?.refinement ||
      []
  )
    .map((facet) => {
      const name = firstText(facet?.name, facet?.field, facet?.key, facet?.id, facet?.labelKey);
      const labelKey = firstText(facet?.label, facet?.labelKey);
      const values = asArray(
        facet?.filterList ||
          facet?.values ||
          facet?.value ||
          facet?.items ||
          facet?.options ||
          facet?.entries ||
          facet?.buckets ||
          []
      )
        .map((value) => {
          const key = firstText(value?.key, value?.field, name);
          const term = firstText(value?.term, value?.value, value?.id, value?.name, value?.label);
          const label = firstText(value?.label, value?.labelText, value?.name, value?.value, value?.term, value?.id);
          const facetFilter = firstText(value?.facetFilter, value?.filter, value?.query) || (key && term ? `${key}:${term}` : "");

          return {
            id: text(value?.id),
            key,
            term,
            label,
            count: Number(value?.count ?? value?.total ?? value?.numberOfResults ?? value?.hits ?? 0),
            facetFilter,
            raw: value,
          };
        })
        .filter((value) => value.key || value.term || value.label);

      return {
        id: text(facet?.id),
        name,
        labelKey,
        label: firstText(facet?.labelText, facet?.label, facet?.labelKey, name),
        values,
        raw: facet,
      };
    })
    .filter((facet) => facet.name || facet.label || facet.values.length);
}

function normalizeItem(item = {}, index = 0) {
  const detailId = extractChildTitleId(item);
  const sourceId = extractSourceId(item);
  const author = item?.author || {};
  const media = item?.media || {};
  const mediumGroup = item?.mediumGroup || {};
  const language = asArray(item?.language).map((entry) => ({
    code: text(entry?.code),
    description: text(entry?.description || entry),
    raw: entry,
  }));

  const childTitleList = asArray(item?.childTitleList).map((child) => ({
    id: text(child?.id),
    childTitleId: text(child?.childTitleId),
    childOrigin: text(child?.childOrigin),
    childTitle: text(child?.childTitle),
    childSubtitle: text(child?.childSubtitle),
    childEdition: text(child?.childEdition),
    childPublicationYear: text(child?.childPublicationYear),
    childMedia: child?.childMedia || null,
    childLanguage: child?.childLanguage || null,
    raw: child,
  }));

  return {
    index,
    id: detailId || sourceId || text(item?.id),
    detailId,
    sourceId,
    frbrId: text(item?.id),
    frbrkey: text(item?.frbrkey),
    cWiseId: text(item?.cWiseId),
    origin: text(item?.origin),
    detailHref: detailId ? `/oba-detail/${encodeURIComponent(detailId)}` : "",
    title: text(item?.title),
    mainTitle: text(item?.mainTitle),
    subtitle: text(item?.subtitle),
    volume: text(item?.volume),
    volumeTitle: text(item?.volumeTitle),
    author: {
      description: text(author?.description || item?.author),
      thesaurusNumber: text(author?.thesaurusNumber),
      searchable: Boolean(author?.searchable),
      type: text(author?.type),
      qualifier: text(author?.qualifier),
      addition: text(author?.addition),
      raw: author,
    },
    contents: text(item?.contents),
    contentsSchoolWise: text(item?.contentsSchoolWise),
    classification: asArray(item?.classification).map((entry) => ({
      description: text(entry?.description || entry),
      thesaurusNumber: text(entry?.thesaurusNumber),
      searchable: Boolean(entry?.searchable),
      classificationSystem: text(entry?.classificationSystem),
      raw: entry,
    })),
    genre: asArray(item?.genre).map((entry) => ({
      code: text(entry?.code),
      description: text(entry?.description || entry),
      imageCode: text(entry?.imageCode),
      raw: entry,
    })),
    media: {
      code: text(media?.code),
      icon: text(media?.icon),
      description: text(media?.description),
      raw: media,
    },
    mediumGroup: {
      code: text(mediumGroup?.code),
      description: text(mediumGroup?.description),
      raw: mediumGroup,
    },
    isbn: asArray(item?.isbn).map(text).filter(Boolean),
    imageUrls: {
      small: text(item?.imageUrls?.small),
      medium: text(item?.imageUrls?.medium),
      large: text(item?.imageUrls?.large),
      raw: item?.imageUrls || {},
    },
    language,
    publicationYear: text(item?.publicationYear),
    edition: text(item?.edition),
    informative: Boolean(item?.informative),
    narrative: Boolean(item?.narrative),
    youth: Boolean(item?.youth),
    adult: Boolean(item?.adult),
    frbrDocumentType: text(item?.frbrDocumentType),
    childTitleList,
    subjectPim: item?.subjectPim
      ? {
          description: text(item?.subjectPim?.description || item?.subjectPim),
          thesaurusNumber: text(item?.subjectPim?.thesaurusNumber),
          searchable: Boolean(item?.subjectPim?.searchable),
          qualifier: text(item?.subjectPim?.qualifier),
          code: text(item?.subjectPim?.code),
          raw: item?.subjectPim,
        }
      : null,
    raw: item,
  };
}

function normalizeSearchResponse({
  query,
  pageNumber,
  limitNumber,
  offset,
  selectedPerspectiveId,
  selectedSearchScope,
  selectedSort,
  selectedFacetFilters,
  selectedTermFilters,
  selectedFilterAvailableTitles,
  perspectiveCall,
  searchCall,
}) {
  const perspectives = normalizePerspectives(perspectiveCall?.body);
  const selectedPerspective =
    perspectives.find((entry) => String(entry.id) === String(selectedPerspectiveId)) || perspectives[0] || null;
  const searchBody = searchCall?.body && typeof searchCall.body === "object" ? searchCall.body : {};
  const rawItems = extractItems(searchBody);

  return {
    query,
    branchId: text(searchBody?.branchId || BRANCH_ID),
    clientType: CLIENT_TYPE,
    selectedPerspectiveId: text(selectedPerspectiveId),
    selectedSearchScope: text(selectedSearchScope),
    selectedSort: text(selectedSort),
    selectedFacetFilters: asArray(selectedFacetFilters).map(text).filter(Boolean),
    selectedTermFilters: asArray(selectedTermFilters).map(text).filter(Boolean),
    selectedFilterAvailableTitles: Boolean(selectedFilterAvailableTitles),
    pagination: {
      page: pageNumber,
      offset,
      limit: limitNumber,
      total: Number(searchBody?.total ?? searchBody?.totalElements ?? searchBody?.count ?? rawItems.length ?? 0),
    },
    perspectives,
    selectedPerspective,
    searchScopes: asArray(selectedPerspective?.searchScopes),
    sortkeys: normalizeSortkeys(searchBody, selectedPerspective),
    facets: normalizeFacets(searchBody),
    items: rawItems.map((item, index) => normalizeItem(item, offset + index + 1)),
    spellcheck: searchBody?.spellcheck || null,
    debug: {
      calls: [perspectiveCall, searchCall].filter(Boolean),
    },
    raw: {
      perspectiveResponse: perspectiveCall?.body || null,
      searchResponse: searchCall?.body || null,
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
    sort = DEFAULT_SORT,
    facetFilter = [],
    termFilter = [],
    filterAvailableTitles = "false",
  } = req.query;

  const query = text(q);

  if (suggest === "1") {
    return res.status(200).json({ suggestions: [], debug: { calls: [] } });
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.max(Math.min(Number(limit) || 20, 100), 1);
  const offset = (pageNumber - 1) * limitNumber;
  const selectedPerspectiveId = text(perspectiveId || DEFAULT_PERSPECTIVE_ID);
  const selectedSearchScope = text(searchScope || DEFAULT_SCOPE);
  const selectedSort = text(sort || DEFAULT_SORT);
  const rawFacetFilters = asArray(facetFilter).map(text).filter(Boolean);
  const selectedTermFilters = asArray(termFilter).map(text).filter(Boolean);
  const selectedFilterAvailableTitles =
    text(filterAvailableTitles).toLowerCase() === "true" ||
    text(filterAvailableTitles) === "1" ||
    rawFacetFilters.includes("availableNow:AT_THE_LIBRARY");
  const selectedFacetFilters = rawFacetFilters.filter((value) => value !== "availableNow:AT_THE_LIBRARY");

  const perspectiveUrl = `${BASE}/branch/${encodeURIComponent(BRANCH_ID)}/clienttype/${encodeURIComponent(CLIENT_TYPE)}/perspective`;
  const perspectiveCall = await fetchSafe(perspectiveUrl);

  if (!perspectiveCall.ok) {
    return res.status(perspectiveCall.status || 500).json({
      error: "Perspectives ophalen mislukt",
      debug: { calls: [perspectiveCall] },
    });
  }

  if (!query && !selectedTermFilters.length) {
    return res.status(200).json(
      normalizeSearchResponse({
        query,
        pageNumber,
        limitNumber,
        offset,
        selectedPerspectiveId,
        selectedSearchScope,
        selectedSort,
        selectedFacetFilters,
        selectedTermFilters,
        selectedFilterAvailableTitles,
        perspectiveCall,
        searchCall: null,
      })
    );
  }

  let searchUrl =
    `${BASE}/branch/${encodeURIComponent(BRANCH_ID)}/perspective/${encodeURIComponent(selectedPerspectiveId)}/titlesummary` +
    `?returnType=default` +
    `&offset=${offset}` +
    `&limit=${limitNumber}` +
    `&searchScope=${encodeURIComponent(selectedSearchScope)}` +
    `&filterAvailableTitles=${encodeURIComponent(selectedFilterAvailableTitles ? "true" : "false")}` +
    `&enableMultiSelectFaceting=true`;

  if (query && query !== "*.*") {
    searchUrl = appendParam(searchUrl, "term", query);
  }

  searchUrl = appendParam(searchUrl, "sort", selectedSort);
  searchUrl = appendRepeatedParam(searchUrl, "facetFilter", selectedFacetFilters);
  searchUrl = appendRepeatedParam(searchUrl, "termFilter", selectedTermFilters);

  const searchCall = await fetchSafe(searchUrl);

  if (!searchCall.ok) {
    return res.status(searchCall.status || 500).json({
      error: "Zoekopdracht ophalen mislukt",
      debug: { calls: [perspectiveCall, searchCall] },
    });
  }

  return res.status(200).json(
    normalizeSearchResponse({
      query,
      pageNumber,
      limitNumber,
      offset,
      selectedPerspectiveId,
      selectedSearchScope,
      selectedSort,
      selectedFacetFilters,
      selectedTermFilters,
      selectedFilterAvailableTitles,
      perspectiveCall,
      searchCall,
    })
  );
}
