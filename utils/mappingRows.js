const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

function splitName(value = "") {
  const source = text(value);
  if (!source.includes(",")) return { last: source.split(/\s+/).pop() || "", first: source };
  const [last = "", ...rest] = source.split(",");
  return { last: text(last), first: text(rest.join(",")) };
}

function splitImprint(imprint = "") {
  const source = text(imprint);
  const [place = "", rest = ""] = source.split(":");
  const year = rest.match(/\d{4}/)?.[0] || "";
  const publisher = text(rest.replace(/,?\s*[©\[\(]?\d{4}[\]\)]?.*$/, ""));
  return { place: text(place), publisher, year };
}

function parseCollation(value = "") {
  const full = text(value).replace(/\s+:\s+/g, ": ").replace(/\s+;\s+/g, " ; ").replace(/\s+\+\s+/g, " + ");
  const [pages = "", rest = ""] = full.split(":");
  const [illustrations = "", sizeAttachment = ""] = rest.split(";");
  const [size = "", attachment = ""] = sizeAttachment.split("+");
  return {
    full,
    pages: text(pages),
    illustrations: text(illustrations),
    size: text(size),
    attachment: text(attachment),
  };
}

function languageValue(title = {}) {
  const lang = asArray(title.language)[0] || {};
  const code = text(lang.code).toLowerCase();
  const description = text(lang.description);
  if (code && description) return `${code} [${description}]`;
  return description || code;
}

function collaboratorsValue(collaborators = [], field) {
  return asArray(collaborators)
    .map((item) => {
      const name = splitName(item?.description);
      if (field === "roles") return text(item?.addition);
      if (field === "last") return name.last;
      if (field === "first") return name.first;
      return text(item?.description);
    })
    .filter(Boolean)
    .join(", ");
}

function secondaryStatement(collaborators = []) {
  const illustrators = asArray(collaborators).filter((item) => text(item?.addition) === "ill");
  if (illustrators.length) {
    return `tekeningen ${illustrators.map((item) => text(item?.description)).join(" en ")}`;
  }
  return asArray(collaborators).map((item) => text(item?.description)).filter(Boolean).join(", ");
}

function buildMaterial(title = {}) {
  const category = text(title.titleCategory || title.youthMaterial?.code);
  const medium = text(title.media?.description);
  if (!category && !medium) return "";
  return `${category} [${medium}]`.trim();
}

function extractLid(titleInfo = []) {
  const record = asArray(titleInfo)[0] || {};
  return text(record.momkeys).match(/(?:^|;)lid=([^;]+)/)?.[1] || "";
}

function extractNbd(title = {}, titleInfo = []) {
  return extractLid(titleInfo) || text(title.libraryRecommendation).match(/\b\d{10}\b/)?.[0] || "";
}

function buildBookCode(title = {}) {
  const authorLast = splitName(title.author?.description).last.toLowerCase();
  if (!authorLast) return "";
  return `A-${authorLast}`;
}

function rawValueByField(raw, field) {
  const title = raw?.title || {};
  const titleInfo = raw?.titleInfo || [];
  const items = asArray(raw?.itemInformation);
  const imprint = splitImprint(title.imprint);
  const collation = parseCollation(title.annotationCollation);
  const authorName = splitName(title.author?.description);
  const series = asArray(title.titleSeries)[0] || {};
  const genre = asArray(title.genre)[0] || {};
  const lang = asArray(title.language)[0] || {};

  switch (field) {
    case "id": return text(title.id);
    case "frbrkey": return text(title.frbrkey || title.frbrKey);
    case "imageUrls.medium": return text(title.imageUrls?.medium || title.imageUrls?.large || title.imageUrls?.small);
    case "title": return text(title.title || title.mainTitle);
    case "mainTitle": return text(title.mainTitle || title.title);
    case "author.display": return text(title.author?.description);
    case "author.addition": return text(title.author?.addition);
    case "author.last": return authorName.last;
    case "author.first": return authorName.first;
    case "collaborators.display": return collaboratorsValue(title.collaborators, "display");
    case "collaborators.roles": return collaboratorsValue(title.collaborators, "roles");
    case "collaborators.last": return collaboratorsValue(title.collaborators, "last");
    case "collaborators.first": return collaboratorsValue(title.collaborators, "first");
    case "secondary.statement": return secondaryStatement(title.collaborators);
    case "media.description": return text(title.media?.description);
    case "media.raw": return text(title.media?.code).toUpperCase() === "BOE" ? "book" : text(title.media?.code).toLowerCase();
    case "isbn[]": return asArray(title.isbn).map(text).filter(Boolean).join(", ");
    case "ppn[]": return asArray(title.ppn).map(text).filter(Boolean).join(", ");
    case "publicationYear": return text(title.publicationYear || asArray(titleInfo)[0]?.publicationYear || imprint.year);
    case "imprint.place": return imprint.place;
    case "imprint.publisher": return imprint.publisher;
    case "annotationEdition": return text(title.annotationEdition);
    case "language.description": return text(lang.description);
    case "language.full": return languageValue(title);
    case "language.code": return text(lang.code).toLowerCase();
    case "subjects[]": return asArray(title.subjects).map((x) => x?.description).filter(Boolean).join(", ");
    case "genre.description": return text(genre.description);
    case "genre.code": return text(genre.description).toLowerCase();
    case "collation.pages": return collation.pages;
    case "collation.illustrations": return collation.illustrations;
    case "collation.size": return collation.size;
    case "collation.attachment": return collation.attachment;
    case "collation.full": return collation.full;
    case "contents": return text(title.contents || asArray(titleInfo)[0]?.description);
    case "audience": return title.youth ? "Jeugd" : text(title.audience?.description);
    case "series.description": return text(series.description);
    case "series.volume": return text(series.addition || series.number);
    case "material": return buildMaterial(title);
    case "bookcode": return buildBookCode(title);
    case "nbd": return extractNbd(title, titleInfo);
    case "prodCountry": return text(title.source).toLowerCase() === "nbd" ? "ne" : "";
    case "item.branches": return items.map((x) => x?.branchName).filter(Boolean).join(" | ");
    case "item.location": return items.map((x) => x?.subLocation || x?.shelfDescription || x?.location).filter(Boolean).join(" | ");
    case "item.callNumber": return items.map((x) => x?.callNumber).filter(Boolean).join(" | ");
    case "item.status": return items.map((x) => x?.effectiveStatus).filter(Boolean).join(" | ");
    default: return "";
  }
}

export function buildDetailMappingRows(raw) {
  const rows = [
    ["ID", "id._text", "/discovery/title/{id}", "id", rawValueByField(raw, "id")],
    ["FRABL", "frabl._text", "/discovery/title/{id}", "frbrkey", rawValueByField(raw, "frbrkey")],
    ["Cover", "coverimages.coverimage._text", "/discovery/title/{id}", "imageUrls.medium|large|small", rawValueByField(raw, "imageUrls.medium")],
    ["Titel", "titles.title._text", "/discovery/title/{id}", "title|mainTitle", rawValueByField(raw, "title")],
    ["Korte titel", "titles.short-title._text", "/discovery/title/{id}", "mainTitle|title", rawValueByField(raw, "mainTitle")],
    ["Auteur", "authors.main-author._text", "/discovery/title/{id}", "author.description", rawValueByField(raw, "author.display")],
    ["Auteur attribuut", "authors.main-author._attributes.type", "/discovery/title/{id}", "author.addition", rawValueByField(raw, "author.addition")],
    ["Secundaire auteurs", "authors.author[]", "/discovery/title/{id}", "collaborators[]", rawValueByField(raw, "collaborators.display")],
    ["Formaat", "formats.format._text", "/discovery/title/{id}", "media.description", rawValueByField(raw, "media.description")],
    ["Formaat raw", "formats.format._attributes.raw", "/discovery/title/{id}", "media.code", rawValueByField(raw, "media.raw")],
    ["ISBN Nummer", "identifiers.isbn-id[]._text", "/discovery/title/{id}", "isbn[]", rawValueByField(raw, "isbn[]")],
    ["ISBN genormaliseerd", "identifiers.normalized-isbn-id[]._text", "/discovery/title/{id}", "isbn[]", rawValueByField(raw, "isbn[]")],
    ["PPN Nummer", "identifiers.ppn-id._text", "/discovery/title/{id}", "ppn[]", rawValueByField(raw, "ppn[]")],
    ["Plaats van uitgave", "publication.publishers.publisher._attributes.place", "/discovery/title/{id}", "imprint.place", rawValueByField(raw, "imprint.place")],
    ["Uitgever", "publication.publishers.publisher._text", "/discovery/title/{id}", "imprint.publisher", rawValueByField(raw, "imprint.publisher")],
    ["Jaar van uitgave", "publication.year._text", "/discovery/title/{id}", "publicationYear", rawValueByField(raw, "publicationYear")],
    ["Editie", "publication.editions.edition._text", "/discovery/title/{id}", "annotationEdition", rawValueByField(raw, "annotationEdition")],
    ["Taal", "languages.language._text", "/discovery/title/{id}", "language.description", rawValueByField(raw, "language.description")],
    ["Taal publicatie", "librarian-info.record.marc.df101.df101._text", "/discovery/title/{id}", "language.code + language.description", rawValueByField(raw, "language.full")],
    ["Onderwerpen", "subjects.topical-subject[]", "/discovery/title/{id}", "subjects[]", rawValueByField(raw, "subjects[]")],
    ["Genre", "genres.genre._text", "/discovery/title/{id}", "genre.description", rawValueByField(raw, "genre.description")],
    ["Pagina's", "description.pages._text", "/discovery/title/{id}", "annotationCollation pages", rawValueByField(raw, "collation.pages")],
    ["Kenmerken", "description.physical-description._text", "/discovery/title/{id}", "annotationCollation", rawValueByField(raw, "collation.full")],
    ["Doelgroep", "target-audiences.target-audience._text", "/discovery/title/{id}", "youth|adult|audience", rawValueByField(raw, "audience")],
    ["Serietitel", "series.series-title._text", "/discovery/title/{id}", "titleSeries[0].description", rawValueByField(raw, "series.description")],
    ["Volume", "series.series-title._attributes.volume", "/discovery/title/{id}", "titleSeries[0].addition|number", rawValueByField(raw, "series.volume")],
    ["Samenvatting", "summaries.summary._text", "/discovery/title/{id}", "contents", rawValueByField(raw, "contents")],
    ["Boekcode", "librarian-info.record.marc.df059.df059._text", "/discovery/title/{id}", "derived author/classification", rawValueByField(raw, "bookcode")],
    ["Algemene materiaalaanduiding", "librarian-info.record.marc.df200.df200[key=b]._text", "/discovery/title/{id}", "titleCategory|youthMaterial + media.description", rawValueByField(raw, "material")],
    ["Eerste verantwoordelijke", "librarian-info.record.marc.df200.df200[key=f]._text", "/discovery/title/{id}", "author.description", rawValueByField(raw, "author.display")],
    ["Titel - Volgende verantwoordelijken", "librarian-info.record.marc.df200.df200[key=g]._text", "/discovery/title/{id}", "collaborators[]", rawValueByField(raw, "secondary.statement")],
    ["Collatie - Illustraties", "librarian-info.record.marc.df215.df215[key=c]._text", "/discovery/title/{id}", "annotationCollation illustrations", rawValueByField(raw, "collation.illustrations")],
    ["Centimeters", "librarian-info.record.marc.df215.df215[key=d]._text", "/discovery/title/{id}", "annotationCollation size", rawValueByField(raw, "collation.size")],
    ["Collatie - Bijlage's", "librarian-info.record.marc.df215.df215[key=e]._text", "/discovery/title/{id}", "annotationCollation attachment", rawValueByField(raw, "collation.attachment")],
    ["Auteur Functie", "librarian-info.record.marc.df700.df700[key=4]._text", "/discovery/title/{id}", "author.addition", rawValueByField(raw, "author.addition")],
    ["Auteur Achternaam", "librarian-info.record.marc.df700.df700[key=a]._text", "/discovery/title/{id}", "author.description last", rawValueByField(raw, "author.last")],
    ["Auteur Voornaam", "librarian-info.record.marc.df700.df700[key=b]._text", "/discovery/title/{id}", "author.description first", rawValueByField(raw, "author.first")],
    ["Auteur secundair functie", "librarian-info.record.marc.df702[].df702[key=4]._text", "/discovery/title/{id}", "collaborators[].addition", rawValueByField(raw, "collaborators.roles")],
    ["Auteur secundair achternaam", "librarian-info.record.marc.df702[].df702[key=a]._text", "/discovery/title/{id}", "collaborators[].description last", rawValueByField(raw, "collaborators.last")],
    ["Auteur secundair voornaam", "librarian-info.record.marc.df702[].df702[key=b]._text", "/discovery/title/{id}", "collaborators[].description first", rawValueByField(raw, "collaborators.first")],
    ["Bestelnummer NBD Nummer", "librarian-info.record.marc.df014.df014._text", "/title/{id}", "momkeys.lid", rawValueByField(raw, "nbd")],
    ["Prod country", "librarian-info.record.marc.df044.df044._text", "/discovery/title/{id}", "source", rawValueByField(raw, "prodCountry")],
    ["Locatie", "librarian-info.record.meta.branches[].branches[key=a|s]", "/title/{id}/iteminformation", "branchId|branchName", rawValueByField(raw, "item.branches")],
    ["Plaats", "librarian-info.record.meta.branches[].branches[key=k]", "/title/{id}/iteminformation", "subLocation|shelfDescription|location", rawValueByField(raw, "item.location")],
    ["Waar te vinden", "librarian-info.record.meta.branches[].branches[key=m]", "/title/{id}/iteminformation", "callNumber", rawValueByField(raw, "item.callNumber")],
    ["Beschikbaarheid view", "raw.itemInformation[].effectiveStatus", "/title/{id}/iteminformation", "effectiveStatus", rawValueByField(raw, "item.status")],
  ];

  return rows.map(([label, jsonPath, endpoint, oclcField, oclcValue]) => ({
    label,
    jsonPath,
    endpoint,
    oclcField,
    oclcValue: text(oclcValue),
  }));
}
