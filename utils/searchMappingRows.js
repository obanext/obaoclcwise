const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

function escapeCsv(value) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function firstResult(raw = {}) {
  return asArray(raw?.searchResponse?.items)[0] || raw?.titles?.[0]?.title || {};
}

function firstMappedResult(mapped = {}) {
  return asArray(mapped?.results?.result)[0] || {};
}

function getPath(obj, path) {
  if (!path) return "";

  const normalized = path
    .replace(/^items\[n\]\./, "")
    .replace(/^results\.result\[n\]\./, "")
    .replace(/\[(\d+)\]/g, ".$1");

  return normalized.split(".").reduce((current, part) => {
    if (current === null || current === undefined) return "";
    return current[part];
  }, obj);
}

function sampleValue(raw = {}, oclcField = "") {
  const item = firstResult(raw);

  if (oclcField === "total") return text(raw?.searchResponse?.total || raw?.total);
  if (oclcField === "request term") return text(raw?.query);
  if (oclcField === "offset + limit") return `page=${text(raw?.page)}, limit=${text(raw?.limit)}`;
  if (oclcField === "facets[]") return `${asArray(raw?.searchResponse?.facets).length} facetgroepen`;

  if (oclcField === "items[n].childTitleList[0].childTitleId") {
    return text(asArray(item?.childTitleList)[0]?.childTitleId);
  }

  const value = getPath(item, oclcField);

  if (Array.isArray(value)) {
    return value
      .map((entry) => text(entry?.description || entry?.code || entry?.childTitleId || entry))
      .filter(Boolean)
      .join(" | ");
  }

  if (value && typeof value === "object") {
    return text(value.description || value.code || JSON.stringify(value));
  }

  return text(value);
}

function mappedValue(mapped = {}, mappedPath = "") {
  const target = mappedPath.startsWith("meta.") ? mapped : firstMappedResult(mapped);
  const value = getPath(target, mappedPath);

  if (Array.isArray(value)) {
    return value.map((entry) => text(entry?._text || entry)).filter(Boolean).join(" | ");
  }

  if (value && typeof value === "object") {
    return text(value._text || JSON.stringify(value));
  }

  return text(value);
}

const ROWS = [
  {
    label: "Aantal resultaten",
    rawXmlPath: "aquabrowser.meta.count",
    rawJsonPath: "meta.count._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "total",
    mappedPath: "meta.count._text",
    transformation: "technisch: number/string",
    status: "direct",
    note: "Totaal aantal treffers uit OCLC titlesummary.",
  },
  {
    label: "Pagina",
    rawXmlPath: "aquabrowser.meta.page",
    rawJsonPath: "meta.page._text",
    oclcEndpoint: "request page/offset",
    oclcField: "offset + limit",
    mappedPath: "meta.page._text",
    transformation: "afgeleid uit request page",
    status: "afgeleid",
    note: "OCLC levert offset/limit; pagina is mockup-requestcontext.",
  },
  {
    label: "Zoekterm",
    rawXmlPath: "niet expliciet in ABL XML",
    rawJsonPath: "niet expliciet in GB JSON",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "request term",
    mappedPath: "meta.query._text",
    transformation: "requestwaarde overnemen",
    status: "afgeleid",
    note: "Toegevoegd voor traceerbaarheid in mockup; geen oud ABL-contractveld.",
  },
  {
    label: "Resultaat-id",
    rawXmlPath: "aquabrowser.results.result[n].id",
    rawJsonPath: "results.result[n].id._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].childTitleList[0].childTitleId",
    mappedPath: "results.result[n].id._text",
    transformation: "directe OCLC childTitleId; geen |oba-catalogus|-prefix",
    status: "direct",
    note: "Geen oude OBA/ABL-id namaken. Wordt gebruikt als Wise detail-id.",
  },
  {
    label: "FRBR/source-id",
    rawXmlPath: "aquabrowser.results.result[n].frabl",
    rawJsonPath: "results.result[n].frabl._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].id",
    mappedPath: "results.result[n].frabl._text",
    transformation: "direct",
    status: "direct",
    note: "OCLC FRBR-id wordt op het bestaande frabl-contractpad gelegd; dit is geen oude ABL FRABL-code.",
  },
  {
    label: "Detailpagina",
    rawXmlPath: "aquabrowser.results.result[n].detail-page",
    rawJsonPath: "results.result[n].detail-page._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].childTitleList[0].childTitleId",
    mappedPath: "results.result[n].detail-page._text",
    transformation: "afgeleid als interne mockup-route /oba-detail/{id}",
    status: "afgeleid",
    note: "Geen oude zoeken.oba.nl URL namaken.",
  },
  {
    label: "Cover",
    rawXmlPath: "aquabrowser.results.result[n].coverimages.coverimage",
    rawJsonPath: "results.result[n].coverimages.coverimage._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].imageUrls.small",
    mappedPath: "results.result[n].coverimages.coverimage._text",
    transformation: "direct",
    status: "direct",
    note: "OCLC cover URL wordt direct gebruikt.",
  },
  {
    label: "Titel",
    rawXmlPath: "aquabrowser.results.result[n].titles.title",
    rawJsonPath: "results.result[n].titles.title._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].title",
    mappedPath: "results.result[n].titles.title._text",
    transformation: "direct",
    status: "direct",
    note: "Geen inhoudelijke normalisatie.",
  },
  {
    label: "Korte titel",
    rawXmlPath: "aquabrowser.results.result[n].titles.short-title",
    rawJsonPath: "results.result[n].titles.short-title._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].mainTitle",
    mappedPath: "results.result[n].titles.short-title._text",
    transformation: "direct met fallback op title",
    status: "direct",
    note: "OCLC mainTitle is leidend waar aanwezig.",
  },
  {
    label: "Hoofdauteur",
    rawXmlPath: "aquabrowser.results.result[n].authors.main-author",
    rawJsonPath: "results.result[n].authors.main-author._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].author.description",
    mappedPath: "results.result[n].authors.main-author._text",
    transformation: "direct; firstname/lastname technisch afgeleid uit dezelfde string",
    status: "direct",
    note: "Naamstring blijft OCLC-vorm.",
  },
  {
    label: "Formaat",
    rawXmlPath: "aquabrowser.results.result[n].formats.format",
    rawJsonPath: "results.result[n].formats.format._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].media.description",
    mappedPath: "results.result[n].formats.format._text",
    transformation: "direct",
    status: "direct",
    note: "Geen book/2[Boek]-legacywaarde namaken.",
  },
  {
    label: "Publicatiejaar",
    rawXmlPath: "aquabrowser.results.result[n].publication.year",
    rawJsonPath: "results.result[n].publication.year._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].publicationYear",
    mappedPath: "results.result[n].publication.year._text",
    transformation: "direct",
    status: "direct",
    note: "Geen vierkante haken toevoegen.",
  },
  {
    label: "Uitgever",
    rawXmlPath: "aquabrowser.results.result[n].publication.publishers.publisher",
    rawJsonPath: "results.result[n].publication.publishers.publisher._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].publisher",
    mappedPath: "results.result[n].publication.publishers.publisher._text",
    transformation: "direct indien aanwezig",
    status: "niet beschikbaar in deze OCLC response",
    note: "titlesummary bevat in de aangeleverde output geen publisher.",
  },
  {
    label: "Taal",
    rawXmlPath: "aquabrowser.results.result[n].languages.language",
    rawJsonPath: "results.result[n].languages.language._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].language[0].description",
    mappedPath: "results.result[n].languages.language._text",
    transformation: "direct",
    status: "direct",
    note: "Code gaat naar language._attributes.raw/search-term.",
  },
  {
    label: "Samenvatting",
    rawXmlPath: "aquabrowser.results.result[n].summaries.summary",
    rawJsonPath: "results.result[n].summaries.summary._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].contents",
    mappedPath: "results.result[n].summaries.summary._text",
    transformation: "direct met fallback contentsSchoolWise",
    status: "direct",
    note: "Geen tekstaanpassing.",
  },
  {
    label: "Genre",
    rawXmlPath: "aquabrowser.results.result[n].genres.genre",
    rawJsonPath: "results.result[n].genres.genre._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].genre[].description",
    mappedPath: "results.result[n].genres.genre._text",
    transformation: "direct",
    status: "direct",
    note: "Geen legacy-lookup; OCLC genreomschrijving wordt gebruikt.",
  },
  {
    label: "ISBN",
    rawXmlPath: "aquabrowser.results.result[n].identifiers.isbn-id",
    rawJsonPath: "results.result[n].identifiers.isbn-id._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].isbn[]",
    mappedPath: "results.result[n].identifiers.isbn-id._text",
    transformation: "direct; object/array volgens aantal waarden",
    status: "direct",
    note: "Geen = prefix toevoegen.",
  },
  {
    label: "PPN",
    rawXmlPath: "aquabrowser.results.result[n].identifiers.ppn-id",
    rawJsonPath: "results.result[n].identifiers.ppn-id._text",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "items[n].ppn[]",
    mappedPath: "results.result[n].identifiers.ppn-id._text",
    transformation: "direct indien aanwezig",
    status: "niet beschikbaar in deze OCLC response",
    note: "PPN zit soms in cover URL, maar wordt niet uit URL geparsed.",
  },
  {
    label: "Facetten",
    rawXmlPath: "niet in standaard resultaatvelden",
    rawJsonPath: "niet in standaard resultaatvelden",
    oclcEndpoint: "GET /branch/{branchId}/perspective/{perspectiveId}/titlesummary",
    oclcField: "facets[]",
    mappedPath: "niet gemapt naar GB result-contract",
    transformation: "alleen gebruikt voor UI-filterpanelen",
    status: "direct",
    note: "Facetten blijven OCLC/UI-context en worden niet in result-itemcontract geforceerd.",
  },
];

export function buildSearchMappingRows(raw = {}, mapped = {}) {
  return ROWS.map((row) => ({
    ...row,
    oclcValue: sampleValue(raw, row.oclcField),
    mappedValue: mappedValue(mapped, row.mappedPath),
  }));
}

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
    headers.join(","),
    ...asArray(rows).map((row) =>
      [
        row.label,
        row.rawXmlPath,
        row.rawJsonPath,
        row.oclcEndpoint,
        row.oclcField,
        row.mappedPath,
        row.transformation,
        row.status,
        row.note,
        row.oclcValue,
        row.mappedValue,
      ]
        .map(escapeCsv)
        .join(",")
    ),
  ];

  return lines.join("\n");
}
