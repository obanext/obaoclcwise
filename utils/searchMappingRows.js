// Convert optional values to safe CSV text.
const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

// Normalize singleton/array values from mapped output and OCLC data.
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

// Check whether a source value is present.
function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "object") return Object.values(value).some(hasValue);
  return true;
}

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

// Return direct when the source exists, otherwise na.
function directStatus(value) {
  return hasValue(value) ? "direct" : "na";
}

// Return afgeleid when the source exists, otherwise na.
function derivedStatus(value) {
  return hasValue(value) ? "afgeleid" : "na";
}

// Resolve the OCLC audience evidence used by the mapper.
function audienceEvidence(title = {}) {
  const direct = title.audience || title.targetGroup;
  if (hasValue(direct)) return { value: direct, status: "direct" };

  const flags = { youth: title.youth, adult: title.adult };
  if (title.youth === true || title.adult === true) return { value: flags, status: "afgeleid" };

  return { value: "", status: "na" };
}

// Build one documentation row for the search mapping CSV.
function row({
  resultIndex = "",
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
    resultaat: resultIndex,
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

// Build the rows that apply once to the complete search response.
function buildGeneralRows(raw, mapped, perspectiveEndpoint, titlesummaryEndpoint) {
  const perspectiveCall = pickCall(raw, "/clienttype/default/perspective");

  return [
    row({
      label: "meta.count",
      rawXmlPath: "aquabrowser.meta.count",
      rawJsonPath: "meta.count._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "total",
      mappedPath: "meta.count._text",
      transformation: "waarde in _text geplaatst",
      status: directStatus(raw?.searchResponse?.total),
      note: "Aantal uit de OCLC titlesummary-response.",
      oclcValue: raw?.searchResponse?.total,
      mappedValue: mapped?.meta?.count?._text,
    }),
    row({
      label: "meta.page",
      rawXmlPath: "aquabrowser.meta.page",
      rawJsonPath: "meta.page._text",
      endpoint: titlesummaryEndpoint,
      oclcPath: "request offset / limit",
      mappedPath: "meta.page._text",
      transformation: "paginanummer berekend uit de request",
      status: "afgeleid",
      note: "Pagina staat niet als apart veld in de OCLC-response.",
      oclcValue: { offset: raw?.searchResponse?.offset, limit: raw?.searchResponse?.limit },
      mappedValue: mapped?.meta?.page?._text,
    }),
    row({
      label: "meta.query",
      rawXmlPath: "zoekterm in request/context",
      rawJsonPath: "meta.query._text of requestcontext",
      endpoint: titlesummaryEndpoint,
      oclcPath: "request term",
      mappedPath: "meta.query._text",
      transformation: "waarde in _text geplaatst",
      status: directStatus(raw?.query),
      note: "Zoekterm uit de mockup-request.",
      oclcValue: raw?.query,
      mappedValue: mapped?.meta?.query?._text,
    }),
    row({
      label: "perspectives / zoekdomeinen",
      rawXmlPath: "na",
      rawJsonPath: "na",
      endpoint: perspectiveEndpoint,
      oclcPath: "perspective[].searchScopes[] / perspective[].sortings[]",
      mappedPath: "UI zoekopties",
      transformation: "rechtstreeks gebruikt door de UI",
      status: directStatus(perspectiveCall?.body?.perspective),
      note: "Geen result-contractveld; wel bron voor de zoekinterface.",
      oclcValue: perspectiveCall?.body?.perspective?.[0],
      mappedValue: raw?.perspectives?.[0],
    }),
  ];
}

// Build all field rows for one result on the current result page.
function buildResultRows(entry = {}, result = {}, resultIndex, endpoint) {
  const title = entry?.title || {};
  const detailId = entry?.resolvedDetailId || entry?.id || title?.id;
  const sourceId = entry?.sourceId || title?.frbrkey || title?.frbrKey;
  const language = asArray(title?.language)[0];
  const publisher = title?.publisher || title?.publicationDetails || title?.imprint;
  const summary = title?.contents || title?.contentsSchoolWise || title?.summary;
  const genres = asArray(title?.genre).map((item) => item?.description).filter(Boolean);
  const subjects = title?.subjects || title?.subjectSchoolWise || title?.subjectPim;
  const isbn = asArray(title?.isbn)[0];
  const ppn = asArray(title?.ppn)[0];
  const collation = title?.annotationCollation;
  const edition = title?.edition || title?.annotationEdition;
  const series = asArray(title?.titleSeries)[0];
  const audience = audienceEvidence(title);

  return [
    row({
      resultIndex,
      label: "results.result[].id",
      rawXmlPath: "aquabrowser.results.result.id",
      rawJsonPath: "results.result[].id",
      endpoint,
      oclcPath: "items[].childTitleList[0].childTitleId",
      mappedPath: "results.result[].id",
      transformation: "waarde in id._text en id._attributes geplaatst",
      status: directStatus(detailId),
      note: "De OCLC/Wise detail-id blijft ongewijzigd; er wordt geen oude OBA-id opgebouwd.",
      oclcValue: detailId,
      mappedValue: result?.id,
    }),
    row({
      resultIndex,
      label: "results.result[].detail-page",
      rawXmlPath: "aquabrowser.results.result.detail-page",
      rawJsonPath: "results.result[].detail-page._text",
      endpoint,
      oclcPath: "items[].childTitleList[0].childTitleId",
      mappedPath: "results.result[].detail-page._text",
      transformation: "interne mockup-link opgebouwd uit de detail-id",
      status: derivedStatus(detailId),
      note: "Interne link naar /oba-detail/{id}.",
      oclcValue: detailId,
      mappedValue: result?.["detail-page"]?._text,
    }),
    row({
      resultIndex,
      label: "results.result[].coverimages.coverimage",
      rawXmlPath: "aquabrowser.results.result.coverimages.coverimage",
      rawJsonPath: "results.result[].coverimages.coverimage._text",
      endpoint,
      oclcPath: "items[].imageUrls.small",
      mappedPath: "results.result[].coverimages.coverimage._text",
      transformation: "waarde in _text geplaatst",
      status: directStatus(title?.imageUrls?.small),
      note: "Kleine cover-URL uit OCLC.",
      oclcValue: title?.imageUrls?.small,
      mappedValue: result?.coverimages?.coverimage?._text,
    }),
    row({
      resultIndex,
      label: "results.result[].titles.title",
      rawXmlPath: "aquabrowser.results.result.titles.title",
      rawJsonPath: "results.result[].titles.title._text",
      endpoint,
      oclcPath: "items[].title / items[].mainTitle",
      mappedPath: "results.result[].titles.title._text",
      transformation: "eerste aanwezige titelveld rechtstreeks gebruikt",
      status: directStatus(title?.title || title?.mainTitle),
      note: "Fallback verandert de bronwaarde niet.",
      oclcValue: title?.title || title?.mainTitle,
      mappedValue: result?.titles?.title?._text,
    }),
    row({
      resultIndex,
      label: "results.result[].titles.short-title",
      rawXmlPath: "aquabrowser.results.result.titles.short-title",
      rawJsonPath: "results.result[].titles.short-title._text",
      endpoint,
      oclcPath: "items[].mainTitle / items[].title",
      mappedPath: "results.result[].titles.short-title._text",
      transformation: "eerste aanwezige titelveld rechtstreeks gebruikt",
      status: directStatus(title?.mainTitle || title?.title),
      note: "mainTitle met fallback op title.",
      oclcValue: title?.mainTitle || title?.title,
      mappedValue: result?.titles?.["short-title"]?._text,
    }),
    row({
      resultIndex,
      label: "results.result[].authors.main-author",
      rawXmlPath: "aquabrowser.results.result.authors.main-author",
      rawJsonPath: "results.result[].authors.main-author",
      endpoint,
      oclcPath: "items[].author.description",
      mappedPath: "results.result[].authors.main-author",
      transformation: "naamtekst direct; firstname/lastname uit naamtekst gesplitst",
      status: derivedStatus(title?.author?.description),
      note: "De zichtbare naam blijft de OCLC-waarde.",
      oclcValue: title?.author?.description,
      mappedValue: result?.authors?.["main-author"],
    }),
    row({
      resultIndex,
      label: "results.result[].formats.format",
      rawXmlPath: "aquabrowser.results.result.formats.format",
      rawJsonPath: "results.result[].formats.format",
      endpoint,
      oclcPath: "items[].media.code / items[].media.description",
      mappedPath: "results.result[].formats.format",
      transformation: "waarden in format-object geplaatst",
      status: directStatus(title?.media),
      note: "OCLC media.code en media.description blijven ongewijzigd.",
      oclcValue: title?.media,
      mappedValue: result?.formats?.format,
    }),
    row({
      resultIndex,
      label: "results.result[].publication.year",
      rawXmlPath: "aquabrowser.results.result.publication.year",
      rawJsonPath: "results.result[].publication.year._text",
      endpoint,
      oclcPath: "items[].publicationYear",
      mappedPath: "results.result[].publication.year._text",
      transformation: "waarde in _text geplaatst",
      status: directStatus(title?.publicationYear),
      note: "Publicatiejaar uit OCLC titlesummary.",
      oclcValue: title?.publicationYear,
      mappedValue: result?.publication?.year?._text,
    }),
    row({
      resultIndex,
      label: "results.result[].publication.publishers.publisher",
      rawXmlPath: "aquabrowser.results.result.publication.publishers.publisher",
      rawJsonPath: "results.result[].publication.publishers.publisher._text",
      endpoint,
      oclcPath: "items[].publisher / items[].publicationDetails / items[].imprint",
      mappedPath: "results.result[].publication.publishers.publisher._text",
      transformation: "eerste aanwezige uitgeverveld rechtstreeks gebruikt",
      status: directStatus(publisher),
      note: "na wanneer titlesummary geen uitgever levert.",
      oclcValue: publisher,
      mappedValue: result?.publication?.publishers?.publisher?._text,
    }),
    row({
      resultIndex,
      label: "results.result[].publication.editions.edition",
      rawXmlPath: "aquabrowser.results.result.publication.editions.edition",
      rawJsonPath: "results.result[].publication.editions.edition._text",
      endpoint,
      oclcPath: "items[].edition / items[].annotationEdition",
      mappedPath: "results.result[].publication.editions.edition._text",
      transformation: "waarde in _text geplaatst",
      status: directStatus(edition),
      note: "Editie wordt gemapt wanneer titlesummary deze levert.",
      oclcValue: edition,
      mappedValue: result?.publication?.editions?.edition?._text,
    }),
    row({
      resultIndex,
      label: "results.result[].languages.language",
      rawXmlPath: "aquabrowser.results.result.languages.language",
      rawJsonPath: "results.result[].languages.language",
      endpoint,
      oclcPath: "items[].language[0].description / items[].language[0].code",
      mappedPath: "results.result[].languages.language",
      transformation: "waarden in language-object geplaatst",
      status: directStatus(language),
      note: "OCLC taalcode blijft in originele vorm staan.",
      oclcValue: language,
      mappedValue: result?.languages?.language,
    }),
    row({
      resultIndex,
      label: "results.result[].description.pages",
      rawXmlPath: "aquabrowser.results.result.description.pages",
      rawJsonPath: "results.result[].description.pages._text",
      endpoint,
      oclcPath: "items[].annotationCollation",
      mappedPath: "results.result[].description.pages._text",
      transformation: "paginadeel uit annotationCollation gesplitst",
      status: derivedStatus(collation),
      note: "na wanneer titlesummary geen collatie levert.",
      oclcValue: collation,
      mappedValue: result?.description?.pages?._text,
    }),
    row({
      resultIndex,
      label: "results.result[].description.physical-description",
      rawXmlPath: "aquabrowser.results.result.description.physical-description",
      rawJsonPath: "results.result[].description.physical-description._text",
      endpoint,
      oclcPath: "items[].annotationCollation",
      mappedPath: "results.result[].description.physical-description._text",
      transformation: "waarde in _text geplaatst",
      status: directStatus(collation),
      note: "Volledige collatietekst uit OCLC.",
      oclcValue: collation,
      mappedValue: result?.description?.["physical-description"]?._text,
    }),
    row({
      resultIndex,
      label: "results.result[].summaries.summary",
      rawXmlPath: "aquabrowser.results.result.summaries.summary",
      rawJsonPath: "results.result[].summaries.summary._text",
      endpoint,
      oclcPath: "items[].contents / items[].contentsSchoolWise / items[].summary",
      mappedPath: "results.result[].summaries.summary._text",
      transformation: "eerste aanwezige samenvattingsveld rechtstreeks gebruikt",
      status: directStatus(summary),
      note: "Fallback verandert de bronwaarde niet.",
      oclcValue: summary,
      mappedValue: result?.summaries?.summary?._text,
    }),
    row({
      resultIndex,
      label: "results.result[].genres.genre",
      rawXmlPath: "aquabrowser.results.result.genres.genre",
      rawJsonPath: "results.result[].genres.genre",
      endpoint,
      oclcPath: "items[].genre[].description",
      mappedPath: "results.result[].genres.genre",
      transformation: "iedere genreomschrijving in een genre-object geplaatst",
      status: directStatus(genres),
      note: "Genre is nu gemapt wanneer OCLC het levert.",
      oclcValue: genres,
      mappedValue: result?.genres?.genre,
    }),
    row({
      resultIndex,
      label: "results.result[].subjects.topical-subject",
      rawXmlPath: "aquabrowser.results.result.subjects.topical-subject",
      rawJsonPath: "results.result[].subjects.topical-subject",
      endpoint,
      oclcPath: "items[].subjects / items[].subjectSchoolWise / items[].subjectPim",
      mappedPath: "results.result[].subjects.topical-subject",
      transformation: "ieder onderwerp in een topical-subject-object geplaatst",
      status: directStatus(subjects),
      note: "na wanneer titlesummary geen onderwerpen levert.",
      oclcValue: subjects,
      mappedValue: result?.subjects?.["topical-subject"],
    }),
    row({
      resultIndex,
      label: "results.result[].target-audiences.target-audience",
      rawXmlPath: "aquabrowser.results.result.target-audiences.target-audience",
      rawJsonPath: "results.result[].target-audiences.target-audience",
      endpoint,
      oclcPath: "items[].audience / items[].targetGroup / items[].youth + items[].adult",
      mappedPath: "results.result[].target-audiences.target-audience",
      transformation:
        audience.status === "afgeleid"
          ? "doelgroep afgeleid uit youth/adult-vlaggen"
          : "directe doelgroepwaarde in contractobject geplaatst",
      status: audience.status,
      note: "Directe audience-data heeft voorrang; anders worden youth/adult-vlaggen gebruikt.",
      oclcValue: audience.value,
      mappedValue: result?.["target-audiences"]?.["target-audience"],
    }),
    row({
      resultIndex,
      label: "results.result[].series.series-title",
      rawXmlPath: "aquabrowser.results.result.series.series-title",
      rawJsonPath: "results.result[].series.series-title",
      endpoint,
      oclcPath: "items[].titleSeries[0]",
      mappedPath: "results.result[].series.series-title",
      transformation: "waarden in series-title-object geplaatst",
      status: directStatus(series),
      note: "na wanneer titlesummary geen reeks levert.",
      oclcValue: series,
      mappedValue: result?.series?.["series-title"],
    }),
    row({
      resultIndex,
      label: "results.result[].identifiers.isbn-id",
      rawXmlPath: "aquabrowser.results.result.identifiers.isbn-id",
      rawJsonPath: "results.result[].identifiers.isbn-id",
      endpoint,
      oclcPath: "items[].isbn[0]",
      mappedPath: "results.result[].identifiers.isbn-id",
      transformation: "eerste ISBN in identifier-object geplaatst",
      status: directStatus(isbn),
      note: "De OCLC ISBN-waarde blijft ongewijzigd.",
      oclcValue: isbn,
      mappedValue: result?.identifiers?.["isbn-id"],
    }),
    row({
      resultIndex,
      label: "results.result[].identifiers.ppn-id",
      rawXmlPath: "aquabrowser.results.result.identifiers.ppn-id",
      rawJsonPath: "results.result[].identifiers.ppn-id",
      endpoint,
      oclcPath: "items[].ppn[0]",
      mappedPath: "results.result[].identifiers.ppn-id",
      transformation: "eerste PPN in identifier-object geplaatst",
      status: directStatus(ppn),
      note: "na wanneer titlesummary geen apart PPN levert.",
      oclcValue: ppn,
      mappedValue: result?.identifiers?.["ppn-id"],
    }),
    row({
      resultIndex,
      label: "results.result[].frabl",
      rawXmlPath: "aquabrowser.results.result.frabl",
      rawJsonPath: "results.result[].frabl",
      endpoint,
      oclcPath: "items[].id / items[].frbrkey",
      mappedPath: "results.result[].frabl",
      transformation: "OCLC FRBR-id in frabl-contractobject geplaatst",
      status: directStatus(sourceId),
      note: "Dit is de OCLC FRBR-id; er wordt geen oude ABL hex-waarde opgebouwd.",
      oclcValue: sourceId,
      mappedValue: result?.frabl,
    }),
    row({
      resultIndex,
      label: "results.result[].undup-info",
      rawXmlPath: "aquabrowser.results.result.undup-info",
      rawJsonPath: "results.result[].undup-info",
      endpoint,
      oclcPath: "items[].id / items[].frbrkey / items[].childTitleList[] / titel / auteur",
      mappedPath: "results.result[].undup-info",
      transformation: "contractobject samengesteld uit beschikbare OCLC groepsgegevens",
      status: derivedStatus(sourceId || title?.childTitleList),
      note: "Geen oude OBA-id of oude zoeklink wordt opgebouwd.",
      oclcValue: { sourceId, childTitleList: title?.childTitleList },
      mappedValue: result?.["undup-info"],
    }),
  ];
}

// Build search mapping documentation for all results on the current page.
export function buildSearchMappingRows(raw = {}, mapped = {}) {
  const perspectiveCall = pickCall(raw, "/clienttype/default/perspective");
  const titlesummaryCall = pickCall(raw, "/titlesummary");
  const perspectiveEndpoint =
    endpointName(perspectiveCall?.url) || "/branch/{branchId}/clienttype/default/perspective";
  const titlesummaryEndpoint =
    endpointName(titlesummaryCall?.url) || "/branch/{branchId}/perspective/{perspectiveId}/titlesummary";

  const sourceEntries = asArray(raw?.titles);
  const mappedResults = asArray(mapped?.results?.result);
  const resultRows = sourceEntries.flatMap((entry, index) =>
    buildResultRows(entry, mappedResults[index] || {}, index + 1, titlesummaryEndpoint)
  );

  return [
    ...buildGeneralRows(raw, mapped, perspectiveEndpoint, titlesummaryEndpoint),
    ...resultRows,
  ];
}

// Convert search mapping rows to a downloadable CSV.
export function toSearchMappingCsv(rows = []) {
  const headers = [
    "resultaat",
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
    ...asArray(rows).map((item) =>
      headers.map((header) => escapeCsv(item?.[header])).join(";")
    ),
  ];

  return lines.join("\n");
}
