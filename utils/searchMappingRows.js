// Convert optional values to safe CSV text.
const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

// Normalize singleton/array values from mapped output and OCLC data.
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

// Escape one CSV cell.
function escapeCsv(value) {
  const stringValue = text(value);

  if (/[",\n\r;]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

// Convert a source/mapped sample value to a compact CSV-readable string.
function sampleValue(value) {
  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return text(value);
  }

  try {
    const json = JSON.stringify(value);
    return json.length > 500 ? `${json.slice(0, 500)}...` : json;
  } catch {
    return text(value);
  }
}

// Use the first mapped search result as a concrete example in the mapping CSV.
function firstResult(mapped = {}) {
  return asArray(mapped?.results?.result)[0] || {};
}

// Use the first OCLC title as a concrete source example in the mapping CSV.
function firstOclcTitle(raw = {}) {
  return asArray(raw?.titles)[0]?.title || asArray(raw?.searchResponse?.items)[0] || {};
}

// Strip host/query from a debug URL so the CSV shows the endpoint path.
function endpointName(url = "") {
  const value = text(url);
  if (!value) return "";
  return value.replace(/^https?:\/\/[^/]+\/restapi/, "").split("?")[0];
}

// Find one OCLC API call in the raw debug call list.
function pickCall(raw = {}, pattern = "") {
  const calls = asArray(raw?.debug?.calls);
  return calls.find((call) => text(call?.url).includes(pattern)) || {};
}

// Build one documentation row for the search mapping CSV.
function row({
  label,
  rawXmlPath,
  rawJsonPath,
  endpoint,
  oclcPath,
  mappedPath,
  transformation,
  status,
  note,
  oclcValue,
  mappedValue,
}) {
  return {
    "OBA zoekpagina": label,
    "raw XML ABL pad": rawXmlPath,
    "raw JSON GB pad": rawJsonPath,
    "OCLC endpoint": endpoint,
    "OCLC veldpad": oclcPath,
    "mapped JSON pad": mappedPath,
    transformatie: transformation,
    status,
    opmerking: note,
    "OCLC waarde": sampleValue(oclcValue),
    "mapped waarde": sampleValue(mappedValue),
  };
}

// Build the search mapping documentation rows from raw OCLC evidence and mapped output.
export function buildSearchMappingRows(raw = {}, mapped = {}) {
  const result = firstResult(mapped);
  const title = firstOclcTitle(raw);
  const perspectiveCall = pickCall(raw, "/clienttype/default/perspective");
  const titlesummaryCall = pickCall(raw, "/titlesummary");
  const perspectiveEndpoint = endpointName(perspectiveCall?.url) || "/branch/{branchId}/clienttype/default/perspective";
  const titlesummaryEndpoint = endpointName(titlesummaryCall?.url) || "/branch/{branchId}/perspective/{perspectiveId}/titlesummary";

  return [
    row({
      label: "meta.count",
      rawXmlPath: "aquabrowser.meta.count",
      rawJsonPath: "meta.count._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "total",
      mappedPath: "meta.count._text",
      transformation: "directe mapping + technische _text-verpakking",
      status: "direct",
      note: "Aantal uit OCLC titlesummary-response; geen inhoudelijke vergelijking met ABL/GB-totaal.",
      oclcValue: raw?.searchResponse?.total,
      mappedValue: mapped?.meta?.count?._text,
    }),
    row({
      label: "meta.page",
      rawXmlPath: "aquabrowser.meta.page",
      rawJsonPath: "meta.page._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "request offset/limit",
      mappedPath: "meta.page._text",
      transformation: "afgeleid uit request-page",
      status: "afgeleid",
      note: "Pagina komt uit de mockup-request, niet als apart veld uit de OCLC-response.",
      oclcValue: { offset: raw?.searchResponse?.offset, limit: raw?.searchResponse?.limit },
      mappedValue: mapped?.meta?.page?._text,
    }),
    row({
      label: "meta.query",
      rawXmlPath: "niet als los veld in ABL; zoekterm zit in request/context",
      rawJsonPath: "meta.query._text of requestcontext",
      endpoint: titlesummaryEndpoint,
      oclcPath: "request term",
      mappedPath: "meta.query._text",
      transformation: "technische _text-verpakking",
      status: "direct",
      note: "Queryterm komt uit de mockup-request.",
      oclcValue: raw?.query,
      mappedValue: mapped?.meta?.query?._text,
    }),
    row({
      label: "perspectives / zoekdomeinen",
      rawXmlPath: "niet aanwezig als resultveld",
      rawJsonPath: "niet aanwezig als resultveld",
      endpoint: perspectiveEndpoint,
      oclcPath: "perspective[].searchScopes[] / perspective[].sortings[]",
      mappedPath: "raw.perspectives; UI filterpanelen",
      transformation: "debug/UI-bron, geen raw JSON-contractveld",
      status: "direct",
      note: "Wordt gebruikt voor de linker zoekfilters en debug, niet voor result-contractmapping.",
      oclcValue: perspectiveCall?.body?.perspective?.[0],
      mappedValue: raw?.perspectives?.[0],
    }),
    row({
      label: "results.result[].id",
      rawXmlPath: "aquabrowser.results.result.id",
      rawJsonPath: "results.result[].id",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].childTitleList[0].childTitleId",
      mappedPath: "results.result[].id._attributes.nativeid / id._text",
      transformation: "technische contractvorming",
      status: "direct",
      note: "Detail-id komt uit OCLC childTitleId. Oude OBA-id wordt niet inhoudelijk vergeleken.",
      oclcValue: title?.childTitleList?.[0]?.childTitleId,
      mappedValue: result?.id,
    }),
    row({
      label: "results.result[].detail-page",
      rawXmlPath: "aquabrowser.results.result.detail-page",
      rawJsonPath: "results.result[].detail-page._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].childTitleList[0].childTitleId",
      mappedPath: "results.result[].detail-page._text",
      transformation: "afgeleid naar interne mockup-link",
      status: "afgeleid",
      note: "Interne link naar /oba-detail/{childTitleId}; geen oude zoeken.oba.nl URL namaken.",
      oclcValue: title?.childTitleList?.[0]?.childTitleId,
      mappedValue: result?.["detail-page"]?._text,
    }),
    row({
      label: "results.result[].coverimages.coverimage",
      rawXmlPath: "aquabrowser.results.result.coverimages.coverimage",
      rawJsonPath: "results.result[].coverimages.coverimage._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].imageUrls.small",
      mappedPath: "results.result[].coverimages.coverimage._text",
      transformation: "directe mapping + technische _text-verpakking",
      status: "direct",
      note: "Gebruikt de kleine cover-URL uit OCLC.",
      oclcValue: title?.imageUrls?.small,
      mappedValue: result?.coverimages?.coverimage?._text,
    }),
    row({
      label: "results.result[].titles.title",
      rawXmlPath: "aquabrowser.results.result.titles.title",
      rawJsonPath: "results.result[].titles.title._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].title / items[].mainTitle",
      mappedPath: "results.result[].titles.title._text",
      transformation: "directe mapping + technische _text/_attributes-verpakking",
      status: "direct",
      note: "Titeltekst uit OCLC titlesummary.",
      oclcValue: title?.title || title?.mainTitle,
      mappedValue: result?.titles?.title?._text,
    }),
    row({
      label: "results.result[].titles.short-title",
      rawXmlPath: "aquabrowser.results.result.titles.short-title",
      rawJsonPath: "results.result[].titles.short-title._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].mainTitle / items[].title",
      mappedPath: "results.result[].titles.short-title._text",
      transformation: "directe mapping + technische _text-verpakking",
      status: "direct",
      note: "Korte titel gebruikt mainTitle met fallback op title.",
      oclcValue: title?.mainTitle || title?.title,
      mappedValue: result?.titles?.["short-title"]?._text,
    }),
    row({
      label: "results.result[].authors.main-author",
      rawXmlPath: "aquabrowser.results.result.authors.main-author",
      rawJsonPath: "results.result[].authors.main-author._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].author.description",
      mappedPath: "results.result[].authors.main-author._text",
      transformation: "directe mapping + technische _text/_attributes-verpakking",
      status: "direct",
      note: "Naam wordt technisch uitgesplitst naar firstname/lastname voor contractvorm; inhoud blijft OCLC.",
      oclcValue: title?.author?.description,
      mappedValue: result?.authors?.["main-author"]?._text,
    }),
    row({
      label: "results.result[].formats.format",
      rawXmlPath: "aquabrowser.results.result.formats.format",
      rawJsonPath: "results.result[].formats.format",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].media.description / items[].media.icon",
      mappedPath: "results.result[].formats.format",
      transformation: "directe mapping + technische contractvorming",
      status: "direct",
      note: "Geen oude OBA-materiaalcode reconstrueren; waarde komt uit OCLC media.",
      oclcValue: title?.media,
      mappedValue: result?.formats?.format,
    }),
    row({
      label: "results.result[].publication.year",
      rawXmlPath: "aquabrowser.results.result.publication.year",
      rawJsonPath: "results.result[].publication.year._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].publicationYear",
      mappedPath: "results.result[].publication.year._text",
      transformation: "directe mapping + technische _text/_attributes-verpakking",
      status: "direct",
      note: "Publicatiejaar uit OCLC titlesummary.",
      oclcValue: title?.publicationYear,
      mappedValue: result?.publication?.year?._text,
    }),
    row({
      label: "results.result[].publication.publishers.publisher",
      rawXmlPath: "aquabrowser.results.result.publication.publishers.publisher",
      rawJsonPath: "results.result[].publication.publishers.publisher._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].publisher / items[].publicationDetails / items[].imprint",
      mappedPath: "results.result[].publication.publishers.publisher._text",
      transformation: "directe mapping indien aanwezig",
      status: text(title?.publisher || title?.publicationDetails || title?.imprint) ? "direct" : "leeg bewust",
      note: "Titlesummary levert publisher niet altijd mee.",
      oclcValue: title?.publisher || title?.publicationDetails || title?.imprint,
      mappedValue: result?.publication?.publishers?.publisher?._text,
    }),
    row({
      label: "results.result[].languages.language",
      rawXmlPath: "aquabrowser.results.result.languages.language",
      rawJsonPath: "results.result[].languages.language._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].language[0].description / items[].language[0].code",
      mappedPath: "results.result[].languages.language._text",
      transformation: "directe mapping + technische _text/_attributes-verpakking",
      status: "direct",
      note: "Taal uit eerste OCLC language-entry.",
      oclcValue: asArray(title?.language)[0],
      mappedValue: result?.languages?.language,
    }),
    row({
      label: "results.result[].summaries.summary",
      rawXmlPath: "aquabrowser.results.result.summaries.summary",
      rawJsonPath: "results.result[].summaries.summary._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].contents / items[].contentsSchoolWise",
      mappedPath: "results.result[].summaries.summary._text",
      transformation: "directe mapping met fallback",
      status: "direct",
      note: "Eerst contents, daarna contentsSchoolWise als fallback.",
      oclcValue: title?.contents || title?.contentsSchoolWise,
      mappedValue: result?.summaries?.summary?._text,
    }),
    row({
      label: "results.result[].genres.genre",
      rawXmlPath: "aquabrowser.results.result.genres.genre",
      rawJsonPath: "results.result[].genres.genre",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].genre[].description",
      mappedPath: "niet gemapt in huidige search-mapper",
      transformation: "geen",
      status: "niet gemapt",
      note: "OCLC levert genregegevens; huidige search-mapper vult dit veld nog niet. Niet aanpassen in deze veilige stap.",
      oclcValue: asArray(title?.genre).map((item) => item?.description).filter(Boolean),
      mappedValue: result?.genres,
    }),
    row({
      label: "results.result[].subjects.topical-subject",
      rawXmlPath: "aquabrowser.results.result.subjects.topical-subject",
      rawJsonPath: "results.result[].subjects.topical-subject",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].subjects / items[].subjectSchoolWise / items[].subjectPim",
      mappedPath: "results.result[].subjects.topical-subject",
      transformation: "directe mapping indien aanwezig",
      status: asArray(result?.subjects?.["topical-subject"]).length ? "direct" : "leeg bewust",
      note: "Niet elk titlesummary-resultaat levert subjects mee.",
      oclcValue: title?.subjects || title?.subjectSchoolWise || title?.subjectPim,
      mappedValue: result?.subjects?.["topical-subject"],
    }),
    row({
      label: "results.result[].identifiers.isbn-id",
      rawXmlPath: "aquabrowser.results.result.identifiers.isbn-id",
      rawJsonPath: "results.result[].identifiers.isbn-id",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].isbn[0]",
      mappedPath: "results.result[].identifiers.isbn-id._text",
      transformation: "directe mapping + technische _text/_attributes-verpakking",
      status: "direct",
      note: "Huidige mapper gebruikt eerste ISBN uit OCLC titlesummary.",
      oclcValue: asArray(title?.isbn)[0],
      mappedValue: result?.identifiers?.["isbn-id"]?._text,
    }),
    row({
      label: "results.result[].identifiers.ppn-id",
      rawXmlPath: "aquabrowser.results.result.identifiers.ppn-id",
      rawJsonPath: "results.result[].identifiers.ppn-id._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].ppn",
      mappedPath: "results.result[].identifiers.ppn-id._text",
      transformation: "directe mapping indien aanwezig",
      status: text(asArray(title?.ppn)[0]) ? "direct" : "leeg bewust",
      note: "Titlesummary levert ppn niet altijd als apart veld; niet uit cover-URL parsen in deze stap.",
      oclcValue: asArray(title?.ppn)[0],
      mappedValue: result?.identifiers?.["ppn-id"]?._text,
    }),
    row({
      label: "results.result[].frabl",
      rawXmlPath: "aquabrowser.results.result.frabl",
      rawJsonPath: "results.result[].frabl._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].id / items[].frbrkey",
      mappedPath: "niet gemapt als top-level frabl in huidige search-mapper",
      transformation: "geen",
      status: "niet gemapt",
      note: "OCLC FRBR-id is niet hetzelfde als oude ABL-FRABL hex-key; geen oude waarde namaken.",
      oclcValue: title?.id || title?.frbrkey,
      mappedValue: result?.frabl,
    }),
    row({
      label: "results.result[].undup-info",
      rawXmlPath: "aquabrowser.results.result.undup-info",
      rawJsonPath: "results.result[].undup-info",
      endpoint: titlesummaryEndpoint,
      oclcPath: "items[].frbrkey / items[].childTitleList[]",
      mappedPath: "results.result[].undup-info",
      transformation: "gedeeltelijke technische contractvorming",
      status: "afgeleid",
      note: "Volledige oude undup-info is niet rechtstreeks beschikbaar in titlesummary; alleen technisch gevuld voor mockup-compatibiliteit.",
      oclcValue: { frbrkey: title?.frbrkey, childTitleList: title?.childTitleList },
      mappedValue: result?.["undup-info"],
    }),
  ];
}

// Convert search mapping rows to a downloadable CSV.
export function toSearchMappingCsv(rows = []) {
  const headers = [
    "OBA zoekpagina",
    "raw XML ABL pad",
    "raw JSON GB pad",
    "OCLC endpoint",
    "OCLC veldpad",
    "mapped JSON pad",
    "transformatie",
    "status",
    "opmerking",
    "OCLC waarde",
    "mapped waarde",
  ];

  const lines = [
    headers.join(";"),
    ...asArray(rows).map((row) =>
      headers.map((header) => escapeCsv(row?.[header])).join(";")
    ),
  ];

  return lines.join("\n");
}
