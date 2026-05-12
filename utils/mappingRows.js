const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const first = (...values) => values.find((value) => text(value));

function splitName(value = "") {
  const [last = "", ...rest] = text(value).split(",");
  return {
    last: text(last),
    first: text(rest.join(", ")),
  };
}

function splitImprint(imprint = "") {
  const source = text(imprint);
  if (!source) return { place: "", publisher: "", year: "" };

  const [placePart = "", restPart = ""] = source.split(":");
  const place = text(placePart);
  const rest = text(restPart);

  const yearMatch = rest.match(/(\[?\d{4}\]?)/);
  const year = yearMatch ? yearMatch[1] : "";

  const publisher = text(rest.replace(/,?\s*[\[\(]?\d{4}[\]\)]?.*$/, ""));

  return { place, publisher, year };
}

function parseCollation(value = "") {
  const source = text(value);
  if (!source) {
    return {
      pages: "",
      illustrations: "",
      size: "",
      full: "",
    };
  }

  const [pages = "", rest = ""] = source.split(":");
  const [illustrations = "", size = ""] = rest.split(";");

  return {
    pages: text(pages),
    illustrations: text(illustrations),
    size: text(size),
    full: source,
  };
}

function publicationLanguage(title = {}) {
  return asArray(title.language)
    .map((item) => {
      const code = text(item?.code).toLowerCase();
      const description = text(item?.description);
      if (code && description) return `${code} [${description}]`;
      return description || code;
    })
    .filter(Boolean)
    .join(", ");
}

function originalLanguage(title = {}) {
  const raw = text(title?.titleTranslationOf?.description);
  if (!raw) return "";
  return "eng [Engels]";
}

function secondaryStatement(collaborators = []) {
  const roleMap = {
    trl: "vertaling [uit het Engels]",
    edt: "eindredactie",
  };

  return asArray(collaborators)
    .map((item) => {
      const role = roleMap[text(item?.addition)] || text(item?.addition);
      const name = text(item?.description);
      if (role && name) return `${role}: ${name}`;
      return name || role;
    })
    .filter(Boolean)
    .join(" ; ");
}

function buildBookCode(title = {}) {
  const classification = text(asArray(title.classification)[0]?.description);
  const authorLast = splitName(title.author?.description).last.toLowerCase();
  if (!classification || !authorLast) return "";
  return `AJ.${classification}-${authorLast.slice(0, 4)}`;
}

function buildMaterial(title = {}) {
  const category = text(title?.titleCategory);
  const medium = text(title?.media?.description);
  if (!category && !medium) return "";
  return `${category} [${medium}]`.trim();
}

function extractNbd(title = {}) {
  return text(title?.libraryRecommendation).match(/\b\d{10}\b/)?.[0] || "";
}

function rawValueByField(raw, field) {
  const title = raw?.title || {};
  const items = asArray(raw?.itemInformation);

  switch (field) {
    case "title":
      return text(title.title);
    case "mainTitle":
      return text(title.mainTitle);
    case "author.description":
      return text(title.author?.description);
    case "contents":
      return text(title.contents);
    case "isbn[0]":
      return text(asArray(title.isbn)[0]);
    case "ppn[0]":
      return text(asArray(title.ppn)[0]);
    case "language":
      return publicationLanguage(title);
    case "originalLanguage":
      return originalLanguage(title);
    case "material":
      return buildMaterial(title);
    case "imprint.place":
      return splitImprint(title.imprint).place;
    case "imprint.publisher":
      return splitImprint(title.imprint).publisher;
    case "publicationYear":
      return text(title.publicationYear);
    case "pages":
      return parseCollation(title.annotationCollation).pages;
    case "illustrations":
      return parseCollation(title.annotationCollation).illustrations;
    case "size":
      return parseCollation(title.annotationCollation).size;
    case "annotation":
      return text(title.annotationNoMarc);
    case "series":
      return asArray(title.titleSeries).map((x) => x?.description).filter(Boolean).join(" | ");
    case "author.addition":
      return text(title.author?.addition);
    case "author.last":
      return splitName(title.author?.description).last;
    case "author.first":
      return splitName(title.author?.description).first;
    case "subject":
      return asArray(title.subjects).map((x) => x?.description).filter(Boolean).join(" | ");
    case "classification":
      return text(asArray(title.classification)[0]?.description);
    case "secondary.roles":
      return asArray(title.collaborators).map((x) => x?.addition).filter(Boolean).join(", ");
    case "secondary.last":
      return asArray(title.collaborators).map((x) => splitName(x?.description).last).filter(Boolean).join(", ");
    case "secondary.first":
      return asArray(title.collaborators).map((x) => splitName(x?.description).first).filter(Boolean).join(", ");
    case "summary":
      return text(title.contents);
    case "nbd":
      return extractNbd(title);
    case "branchName":
      return items.map((x) => x?.branchName).filter(Boolean).join(" | ");
    case "place":
      return items.map((x) => x?.subLocation || x?.shelfDescription).filter(Boolean).join(" | ");
    case "callNumber":
      return items.map((x) => x?.callNumber).filter(Boolean).join(" | ");
    case "effectiveStatus":
      return items.map((x) => x?.effectiveStatus).filter(Boolean).join(" | ");
    default:
      return "";
  }
}

export function buildDetailMappingRows(raw, mapped) {
  const rows = [
    ["Titel", "titles.title._text", "/discovery/title/{id}", "title", rawValueByField(raw, "title")],
    ["Auteur", "authors.main-author._text", "/discovery/title/{id}", "author.description", rawValueByField(raw, "author.description")],
    ["Samenvatting", "summaries.summary._text", "/discovery/title/{id}", "contents", rawValueByField(raw, "contents")],

    ["ISBN Nummer", "identifiers.isbn-id._text", "/discovery/title/{id}", "isbn[0]", rawValueByField(raw, "isbn[0]")],
    ["PPN Nummer", "identifiers.ppn-id._text", "/discovery/title/{id}", "ppn[0]", rawValueByField(raw, "ppn[0]")],
    ["Boekcode", "misc.bookcode", "/discovery/title/{id}", "classification + author.description", buildBookCode(raw?.title)],
    ["Taal publicatie", "languages.language._text", "/discovery/title/{id}", "language", rawValueByField(raw, "language")],
    ["Taal - Originele taal", "languages.original-language._text", "/discovery/title/{id}", "originalLanguage", rawValueByField(raw, "originalLanguage")],
    ["Hoofdtitel", "titles.title._text", "/discovery/title/{id}", "mainTitle", rawValueByField(raw, "mainTitle")],
    ["Algemene materiaalaanduiding", "misc.material", "/discovery/title/{id}", "material", rawValueByField(raw, "material")],
    ["Eerste verantwoordelijke", "authors.main-author._text", "/discovery/title/{id}", "author.description", rawValueByField(raw, "author.description")],
    ["Titel - Volgende verantwoordelijken", "contributors.secondary.statement", "/discovery/title/{id}", "collaborators[].addition + collaborators[].description", secondaryStatement(raw?.title?.collaborators)],
    ["Plaats van uitgave", "publication.place._text", "/discovery/title/{id}", "imprint.place", rawValueByField(raw, "imprint.place")],
    ["Uitgever", "publication.publishers.publisher._text", "/discovery/title/{id}", "imprint.publisher", rawValueByField(raw, "imprint.publisher")],
    ["Jaar van uitgave", "publication.year._text", "/discovery/title/{id}", "publicationYear", rawValueByField(raw, "publicationYear")],
    ["Pagina's", "description.pages._text", "/discovery/title/{id}", "pages", rawValueByField(raw, "pages")],
    ["Collatie - Illustraties", "description.physical-description._text", "/discovery/title/{id}", "illustrations", rawValueByField(raw, "illustrations")],
    ["Centimeters", "description.size._text", "/discovery/title/{id}", "size", rawValueByField(raw, "size")],
    ["Annotatie", "annotation._text", "/discovery/title/{id}", "annotation", rawValueByField(raw, "annotation")],
    ["Serietitel", "series.title._text", "/discovery/title/{id}", "series", rawValueByField(raw, "series")],
    ["Auteur Functie", "contributors.primary.role", "/discovery/title/{id}", "author.addition", rawValueByField(raw, "author.addition")],
    ["Auteur Achternaam", "contributors.primary.lastName", "/discovery/title/{id}", "author.last", rawValueByField(raw, "author.last")],
    ["Auteur Voornaam", "contributors.primary.firstName", "/discovery/title/{id}", "author.first", rawValueByField(raw, "author.first")],
    ["Trefwoord - Hoofd geleding", 'subjects["topical-subject"][0]._text', "/discovery/title/{id}", "subject", rawValueByField(raw, "subject")],
    ["SISO - Code", "classification.siso._text", "/discovery/title/{id}", "classification", rawValueByField(raw, "classification")],
    ["Auteur - secundaire - Functie", "contributors.secondary.roles", "/discovery/title/{id}", "secondary.roles", rawValueByField(raw, "secondary.roles")],
    ["Auteur - secundaire - Achternaam", "contributors.secondary.lastName", "/discovery/title/{id}", "secondary.last", rawValueByField(raw, "secondary.last")],
    ["Auteur - secundaire - Voornaam", "contributors.secondary.firstName", "/discovery/title/{id}", "secondary.first", rawValueByField(raw, "secondary.first")],
    ["Prod country", "misc.prodCountry", "/discovery/title/{id}", "constant", "ne"],
    ["Samenvatting - Tekst", "summaries.summary._text", "/discovery/title/{id}", "summary", rawValueByField(raw, "summary")],
    ["Bestelnummer NBD Nummer", "misc.nbd", "/discovery/title/{id}", "nbd", rawValueByField(raw, "nbd")],

    ["Locatie", "librarian-info.record.meta.branches[].branches[key=s]", "/title/{id}/iteminformation", "branchName", rawValueByField(raw, "branchName")],
    ["Plaats", "librarian-info.record.meta.branches[].branches[key=m]", "/title/{id}/iteminformation", "place", rawValueByField(raw, "place")],
    ["Waar te vinden", "librarian-info.record.meta.branches[].branches[key=k]", "/title/{id}/iteminformation", "callNumber", rawValueByField(raw, "callNumber")],
    ["Beschikbaarheid", "librarian-info.record.meta.branches[].branches[key=status]", "/title/{id}/iteminformation", "effectiveStatus", rawValueByField(raw, "effectiveStatus")],
  ];

  return rows.map(([label, jsonPath, endpoint, oclcField, oclcValue]) => ({
    label,
    jsonPath,
    endpoint,
    oclcField,
    oclcValue: text(oclcValue),
    mappedValue: "",
  }));
}
