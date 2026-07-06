const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

function firstText(...values) {
  return values.map(text).find(Boolean) || "";
}

function splitName(value = "") {
  const source = text(value);
  if (!source.includes(",")) {
    const parts = source.split(/\s+/).filter(Boolean);
    return { last: parts.pop() || "", first: parts.join(" ") };
  }
  const [last = "", ...rest] = source.split(",");
  return { last: text(last), first: text(rest.join(",")) };
}

function splitImprint(imprint = "") {
  const source = text(imprint);
  const [place = "", rest = ""] = source.split(":");
  const year = rest.match(/[©\[\(]?(\d{4})[\]\)]?/)?.[1] || "";
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
  const code = text(lang.code);
  const description = text(lang.description);
  if (code && description) return `${code} [${description}]`;
  return description || code;
}

function collaboratorValue(collaborators = [], field) {
  return asArray(collaborators)
    .map((item) => {
      const name = splitName(item?.description);
      if (field === "roles") return text(item?.addition);
      if (field === "last") return name.last;
      if (field === "first") return name.first;
      return text(item?.description);
    })
    .filter(Boolean)
    .join(" | ");
}

function extractLid(value = "") {
  return text(value).match(/(?:^|[;?&])lid=([^;&]+)/)?.[1] || "";
}

function firstItemValue(raw, field) {
  return text(asArray(raw?.itemInformation).find((item) => text(item?.[field]))?.[field]);
}

function rawValueByField(raw, field) {
  const title = raw?.title || {};
  const titleInfo = asArray(raw?.titleInfo)[0] || {};
  const availability = asArray(raw?.availability)[0] || {};
  const imprint = splitImprint(title.imprint);
  const collation = parseCollation(title.annotationCollation);
  const authorName = splitName(title.author?.description);
  const firstCollaboratorName = splitName(asArray(title.collaborators)[0]?.description);
  const series = asArray(title.titleSeries)[0] || {};
  const genreValues = asArray(title.genre).map((x) => x?.description).filter(Boolean).join(" | ");
  const subjectValues = asArray(title.subjects).map((x) => x?.description).filter(Boolean).join(" | ");
  const lang = asArray(title.language)[0] || {};
  const firstItem = asArray(raw?.itemInformation)[0] || {};

  switch (field) {
    case "id": return text(title.id);
    case "frbrkey": return text(title.frbrkey || title.frbrKey);
    case "imageUrls.medium": return text(title.imageUrls?.medium || title.imageUrls?.large || title.imageUrls?.small);
    case "title": return text(title.title || title.mainTitle);
    case "mainTitle": return text(title.mainTitle || title.title);
    case "author.description": return text(title.author?.description);
    case "author.addition": return text(title.author?.addition);
    case "author.type": return text(title.author?.type);
    case "author.last": return authorName.last;
    case "author.first": return authorName.first;
    case "collaborators.description": return collaboratorValue(title.collaborators, "display");
    case "collaborators.addition": return collaboratorValue(title.collaborators, "roles");
    case "collaborators.last": return collaboratorValue(title.collaborators, "last");
    case "collaborators.first": return collaboratorValue(title.collaborators, "first");
    case "media.description": return text(title.media?.description);
    case "media.code": return text(title.media?.code);
    case "isbn[]": return asArray(title.isbn).map(text).filter(Boolean).join(" | ");
    case "ppn[]": return asArray(title.ppn).map(text).filter(Boolean).join(" | ");
    case "publicationYear": return text(title.publicationYear || titleInfo.publicationYear);
    case "imprint": return text(title.imprint);
    case "imprint.place": return imprint.place;
    case "imprint.publisher": return imprint.publisher;
    case "imprint.year": return imprint.year;
    case "annotationEdition": return text(title.annotationEdition);
    case "language.description": return text(lang.description);
    case "language.composed": return languageValue(title);
    case "language.code": return text(lang.code);
    case "subjects.description": return subjectValues;
    case "genre.description": return genreValues;
    case "annotationCollation": return text(title.annotationCollation);
    case "collation.pages": return collation.pages;
    case "collation.illustrations": return collation.illustrations;
    case "collation.size": return collation.size;
    case "collation.attachment": return collation.attachment;
    case "collation.full": return collation.full;
    case "contents": return text(title.contents || titleInfo.description);
    case "audience.description": return text(title.audience?.description);
    case "audience.code": return text(title.audience?.code);
    case "series.description": return text(series.description);
    case "series.volume": return text(series.addition || series.number);
    case "item.callNumber": return firstItemValue(raw, "callNumber") || firstItemValue(raw, "headWord");
    case "item.barcode": return firstText(firstItemValue(raw, "barcode"), firstItemValue(raw, "id"));
    case "item.branchId": return asArray(raw?.itemInformation).map((x) => x?.branchId).filter(Boolean).join(" | ");
    case "item.branchName": return asArray(raw?.itemInformation).map((x) => x?.branchName).filter(Boolean).join(" | ");
    case "item.location": return asArray(raw?.itemInformation).map((x) => x?.subLocation || x?.shelfDescription || x?.location).filter(Boolean).join(" | ");
    case "item.shelfCode": return asArray(raw?.itemInformation).map((x) => x?.shelfCode || x?.location).filter(Boolean).join(" | ");
    case "item.status": return asArray(raw?.itemInformation).map((x) => x?.effectiveStatus).filter(Boolean).join(" | ");
    case "item.composite": return [firstItem.barcode || firstItem.id, firstItem.branchId, firstItem.branchName, firstItem.shelfCode || firstItem.location, firstItem.callNumber, firstItem.subLocation || firstItem.shelfDescription || firstItem.location].map(text).join("^");
    case "momkeys.lid": return extractLid(titleInfo.momkeys) || extractLid(title.imageUrls?.medium || title.imageUrls?.large);
    case "source": return text(title.source);
    case "availability.status": return asArray(availability.availability).map((x) => x?.status).filter(Boolean).join(" | ");
    case "availability.holdAllowed": return text(availability.holdAllowed);
    case "availability.holdQueuePosition": return text(availability.holdQueuePosition);
    case "unavailable": return "";
    default: return "";
  }
}

const row = ({ label, rawXmlPath, rawJsonPath, oclcEndpoint = "", oclcField = "", mappedPath, transformation = "direct", status = "direct", note = "", valueField = "" }) => ({
  label,
  rawXmlPath,
  rawJsonPath,
  oclcEndpoint,
  oclcField,
  mappedPath: mappedPath || rawJsonPath,
  transformation,
  status,
  note,
  valueField,
});

const ROWS = [
  row({ label: "Aquabrowser metadata", rawXmlPath: "/aquabrowser/@version|@before-rendering-time|@total-time|@detail-level", rawJsonPath: "_attributes", mappedPath: "_attributes", oclcEndpoint: "", oclcField: "", transformation: "leeg laten", status: "legacy/metadata niet gemapt", note: "OCLC levert deze ABL-runtime metadata niet.", valueField: "unavailable" }),
  row({ label: "Request context", rawXmlPath: "/aquabrowser/meta/rctx", rawJsonPath: "meta.rctx._text", mappedPath: "meta.rctx._text", transformation: "leeg laten", status: "legacy/metadata niet gemapt", note: "Niet beschikbaar uit OCLC.", valueField: "unavailable" }),
  row({ label: "ID", rawXmlPath: "/aquabrowser/id", rawJsonPath: "id._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "id", mappedPath: "id._text", transformation: "direct", status: "direct", note: "ABL id-attributen blijven leeg; Wise titleId blijft testbaar.", valueField: "id" }),
  row({ label: "ID attributen", rawXmlPath: "/aquabrowser/id/@nativeid|@ds|@search-term", rawJsonPath: "id._attributes", mappedPath: "id._attributes", transformation: "leeg laten", status: "legacy/metadata niet gemapt", note: "Geen |oba-catalogus|... namaken.", valueField: "unavailable" }),
  row({ label: "FRABL", rawXmlPath: "/aquabrowser/frabl", rawJsonPath: "frabl._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "frbrkey|frbrKey", mappedPath: "frabl._text", transformation: "direct indien aanwezig, anders leeg", status: "niet beschikbaar in aangeleverde OCLC response", note: "OCLC response bevat frbrDocumentType, geen FRABL key.", valueField: "frbrkey" }),
  row({ label: "Detailpagina URL", rawXmlPath: "/aquabrowser/detail-page", rawJsonPath: "detail-page._text", mappedPath: "detail-page._text", transformation: "leeg laten", status: "legacy/metadata niet gemapt", note: "Geen oude zoeken.oba.nl detail-url namaken.", valueField: "unavailable" }),
  row({ label: "Cover", rawXmlPath: "/aquabrowser/coverimages/coverimage", rawJsonPath: "coverimages.coverimage._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "imageUrls.medium|large|small", mappedPath: "coverimages.coverimage._text", valueField: "imageUrls.medium" }),
  row({ label: "Titel", rawXmlPath: "/aquabrowser/titles/title", rawJsonPath: "titles.title._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "title|mainTitle", mappedPath: "titles.title._text", valueField: "title" }),
  row({ label: "Korte titel", rawXmlPath: "/aquabrowser/titles/short-title", rawJsonPath: "titles.short-title._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "mainTitle|title", mappedPath: "titles.short-title._text", valueField: "mainTitle" }),
  row({ label: "Hoofdauteur", rawXmlPath: "/aquabrowser/authors/main-author", rawJsonPath: "authors.main-author._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "author.description", mappedPath: "authors.main-author._text", transformation: "direct", status: "direct", note: "Geen naamvolgorde omdraaien.", valueField: "author.description" }),
  row({ label: "Hoofdauteur attributen", rawXmlPath: "/aquabrowser/authors/main-author/@firstname|@lastname|@type", rawJsonPath: "authors.main-author._attributes", oclcEndpoint: "/discovery/title/{id}", oclcField: "author.description|author.addition|author.type", mappedPath: "authors.main-author._attributes", transformation: "deels direct, naamdelen gesplitst", status: "afgeleid", note: "firstname/lastname worden uit author.description gesplitst voor contractattributen.", valueField: "author.description" }),
  row({ label: "Secundaire auteurs", rawXmlPath: "/aquabrowser/authors/author", rawJsonPath: "authors.author", oclcEndpoint: "/discovery/title/{id}", oclcField: "collaborators[].description", mappedPath: "authors.author", valueField: "collaborators.description" }),
  row({ label: "Formaat", rawXmlPath: "/aquabrowser/formats/format", rawJsonPath: "formats.format._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "media.description", mappedPath: "formats.format._text", valueField: "media.description" }),
  row({ label: "Formaat code", rawXmlPath: "/aquabrowser/formats/format/@raw", rawJsonPath: "formats.format._attributes.raw", oclcEndpoint: "/discovery/title/{id}", oclcField: "media.code", mappedPath: "formats.format._attributes.raw", transformation: "direct", status: "direct", note: "Geen BOE->book normalisatie.", valueField: "media.code" }),
  row({ label: "ISBN", rawXmlPath: "/aquabrowser/identifiers/isbn-id", rawJsonPath: "identifiers.isbn-id", oclcEndpoint: "/discovery/title/{id}", oclcField: "isbn[]", mappedPath: "identifiers.isbn-id", transformation: "technische contractvorming: '=' prefix", status: "technisch", note: "Waarde blijft OCLC ISBN; prefix volgt bestaand zoekcontract.", valueField: "isbn[]" }),
  row({ label: "ISBN genormaliseerd", rawXmlPath: "/aquabrowser/identifiers/normalized-isbn-id", rawJsonPath: "identifiers.normalized-isbn-id", oclcEndpoint: "/discovery/title/{id}", oclcField: "isbn[]", mappedPath: "identifiers.normalized-isbn-id", transformation: "direct", status: "direct", valueField: "isbn[]" }),
  row({ label: "PPN", rawXmlPath: "/aquabrowser/identifiers/ppn-id", rawJsonPath: "identifiers.ppn-id._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "ppn[]", mappedPath: "identifiers.ppn-id._text", valueField: "ppn[]" }),
  row({ label: "Publicatiejaar", rawXmlPath: "/aquabrowser/publication/year", rawJsonPath: "publication.year._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "publicationYear", mappedPath: "publication.year._text", valueField: "publicationYear" }),
  row({ label: "Plaats van uitgave", rawXmlPath: "/aquabrowser/publication/publishers/publisher/@place", rawJsonPath: "publication.publishers.publisher._attributes.place", oclcEndpoint: "/discovery/title/{id}", oclcField: "imprint", mappedPath: "publication.publishers.publisher._attributes.place", transformation: "gesplitst uit imprint", status: "afgeleid", valueField: "imprint.place" }),
  row({ label: "Uitgever", rawXmlPath: "/aquabrowser/publication/publishers/publisher", rawJsonPath: "publication.publishers.publisher._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "imprint", mappedPath: "publication.publishers.publisher._text", transformation: "gesplitst uit imprint", status: "afgeleid", valueField: "imprint.publisher" }),
  row({ label: "Editie", rawXmlPath: "/aquabrowser/publication/editions/edition", rawJsonPath: "publication.editions.edition._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "annotationEdition", mappedPath: "publication.editions.edition._text", transformation: "direct indien aanwezig", status: "direct", valueField: "annotationEdition" }),
  row({ label: "Taal", rawXmlPath: "/aquabrowser/languages/language", rawJsonPath: "languages.language._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "language[0].description", mappedPath: "languages.language._text", valueField: "language.description" }),
  row({ label: "Taalcode", rawXmlPath: "/aquabrowser/languages/language/@raw", rawJsonPath: "languages.language._attributes.raw", oclcEndpoint: "/discovery/title/{id}", oclcField: "language[0].code", mappedPath: "languages.language._attributes.raw", transformation: "direct", status: "direct", note: "Geen lowercase-normalisatie.", valueField: "language.code" }),
  row({ label: "Onderwerpen", rawXmlPath: "/aquabrowser/subjects/topical-subject", rawJsonPath: "subjects.topical-subject", oclcEndpoint: "/discovery/title/{id}", oclcField: "subjects[].description", mappedPath: "subjects.topical-subject", valueField: "subjects.description" }),
  row({ label: "Genres", rawXmlPath: "/aquabrowser/genres/genre", rawJsonPath: "genres.genre", oclcEndpoint: "/discovery/title/{id}", oclcField: "genre[].description", mappedPath: "genres.genre", transformation: "direct", status: "direct", note: "Geen DI->Dierenleven of VH->Verhalenbundel lookup.", valueField: "genre.description" }),
  row({ label: "Pagina's", rawXmlPath: "/aquabrowser/description/pages", rawJsonPath: "description.pages._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "annotationCollation", mappedPath: "description.pages._text", transformation: "gesplitst uit annotationCollation", status: "afgeleid", valueField: "collation.pages" }),
  row({ label: "Kenmerken", rawXmlPath: "/aquabrowser/description/physical-description", rawJsonPath: "description.physical-description._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "annotationCollation", mappedPath: "description.physical-description._text", transformation: "direct met whitespace-normalisatie", status: "technisch", valueField: "collation.full" }),
  row({ label: "Doelgroep", rawXmlPath: "/aquabrowser/target-audiences/target-audience", rawJsonPath: "target-audiences.target-audience._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "audience.description", mappedPath: "target-audiences.target-audience._text", transformation: "direct", status: "direct", note: "Geen youth=true -> Jeugd normalisatie.", valueField: "audience.description" }),
  row({ label: "Serietitel", rawXmlPath: "/aquabrowser/series/series-title", rawJsonPath: "series.series-title._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "titleSeries[0].description", mappedPath: "series.series-title._text", transformation: "direct indien aanwezig", status: "direct", valueField: "series.description" }),
  row({ label: "Samenvatting", rawXmlPath: "/aquabrowser/summaries/summary", rawJsonPath: "summaries.summary._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "contents", mappedPath: "summaries.summary._text", valueField: "contents" }),
  row({ label: "Boekcode", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df059/df059[@key='j']", rawJsonPath: "librarian-info.record.marc.df059.df059._text", oclcEndpoint: "/title/{id}/iteminformation", oclcField: "itemInformation[].callNumber|headWord", mappedPath: "librarian-info.record.marc.df059.df059._text", transformation: "direct eerste beschikbare exemplaarwaarde", status: "direct", note: "Geen B GOLD -> B-gold conversie.", valueField: "item.callNumber" }),
  row({ label: "Taal publicatie", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df101/df101[@key='a']", rawJsonPath: "librarian-info.record.marc.df101.df101._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "language[0].code + language[0].description", mappedPath: "librarian-info.record.marc.df101.df101._text", transformation: "samengesteld uit twee OCLC velden", status: "afgeleid", valueField: "language.composed" }),
  row({ label: "MARC titel", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df200/df200[@key='a']", rawJsonPath: "librarian-info.record.marc.df200.df200[key=a]._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "mainTitle|title", mappedPath: "librarian-info.record.marc.df200.df200[key=a]._text", valueField: "mainTitle" }),
  row({ label: "Algemene materiaalaanduiding", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df200/df200[@key='b']", rawJsonPath: "librarian-info.record.marc.df200.df200[key=b]._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "media.description", mappedPath: "librarian-info.record.marc.df200.df200[key=b]._text", transformation: "direct", status: "direct", note: "Geen 2 [Boek] of 4 [Boek] opbouw.", valueField: "media.description" }),
  row({ label: "Eerste verantwoordelijke", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df200/df200[@key='f']", rawJsonPath: "librarian-info.record.marc.df200.df200[key=f]._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "author.description", mappedPath: "librarian-info.record.marc.df200.df200[key=f]._text", transformation: "direct", status: "direct", valueField: "author.description" }),
  row({ label: "Volgende verantwoordelijken", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df200/df200[@key='g']", rawJsonPath: "librarian-info.record.marc.df200.df200[key=g]._text", oclcEndpoint: "/discovery/title/{id}", oclcField: "collaborators[].description", mappedPath: "librarian-info.record.marc.df200.df200[key=g]._text", transformation: "direct join", status: "technisch", note: "Geen 'met illustraties van' of 'tekeningen' tekst toevoegen.", valueField: "collaborators.description" }),
  row({ label: "Plaats/uitgever/jaar MARC", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df210", rawJsonPath: "librarian-info.record.marc.df210", oclcEndpoint: "/discovery/title/{id}", oclcField: "imprint|publicationYear", mappedPath: "librarian-info.record.marc.df210", transformation: "imprint gesplitst, jaar direct publicationYear", status: "afgeleid", valueField: "imprint" }),
  row({ label: "Collatie MARC", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df215", rawJsonPath: "librarian-info.record.marc.df215", oclcEndpoint: "/discovery/title/{id}", oclcField: "annotationCollation", mappedPath: "librarian-info.record.marc.df215", transformation: "gesplitst uit annotationCollation", status: "afgeleid", valueField: "annotationCollation" }),
  row({ label: "Auteur MARC", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df700", rawJsonPath: "librarian-info.record.marc.df700", oclcEndpoint: "/discovery/title/{id}", oclcField: "author.description|author.addition", mappedPath: "librarian-info.record.marc.df700", transformation: "rol direct, naamdelen gesplitst", status: "afgeleid", valueField: "author.description" }),
  row({ label: "Onderwerpen MARC", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df630", rawJsonPath: "librarian-info.record.marc.df630", oclcEndpoint: "/discovery/title/{id}", oclcField: "subjects[].description", mappedPath: "librarian-info.record.marc.df630", valueField: "subjects.description" }),
  row({ label: "Genres MARC", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df691", rawJsonPath: "librarian-info.record.marc.df691", oclcEndpoint: "/discovery/title/{id}", oclcField: "genre[].description", mappedPath: "librarian-info.record.marc.df691", transformation: "direct", status: "direct", note: "Geen lowercase of legacy genre lookup.", valueField: "genre.description" }),
  row({ label: "Secundaire auteur MARC", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df702", rawJsonPath: "librarian-info.record.marc.df702", oclcEndpoint: "/discovery/title/{id}", oclcField: "collaborators[].description|collaborators[].addition", mappedPath: "librarian-info.record.marc.df702", transformation: "rol direct, naamdelen gesplitst", status: "afgeleid", valueField: "collaborators.description" }),
  row({ label: "Bestelnummer NBD Nummer", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df014/df014[@key='a']", rawJsonPath: "librarian-info.record.marc.df014.df014._text", oclcEndpoint: "/title/{id}", oclcField: "momkeys", mappedPath: "librarian-info.record.marc.df014.df014._text", transformation: "lid=... uit momkeys geparsed", status: "afgeleid", valueField: "momkeys.lid" }),
  row({ label: "Prod country", rawXmlPath: "/aquabrowser/librarian-info/record/marc/df044/df044[@key='a']", rawJsonPath: "librarian-info.record.marc.df044.df044._text", oclcEndpoint: "", oclcField: "", mappedPath: "librarian-info.record.marc.df044.df044._text", transformation: "leeg laten", status: "niet beschikbaar in OCLC", note: "OCLC source=NBD is geen productieland; dus niet naar 'ne' vertalen.", valueField: "unavailable" }),
  row({ label: "Exemplaar composite", rawXmlPath: "/aquabrowser/librarian-info/record/meta/branches/branches[@key='p']", rawJsonPath: "librarian-info.record.meta.branches[].branches[key=p]._text", oclcEndpoint: "/title/{id}/iteminformation", oclcField: "barcode|id|branchId|branchName|shelfCode|callNumber|subLocation|returnDate|effectiveStatus", mappedPath: "librarian-info.record.meta.branches[].branches[key=p]._text", transformation: "samengesteld uit OCLC exemplaarvelden", status: "afgeleid", valueField: "item.composite" }),
  row({ label: "Exemplaar barcode/id", rawXmlPath: "/aquabrowser/librarian-info/record/meta/branches/branches[@key='b']", rawJsonPath: "librarian-info.record.meta.branches[].branches[key=b]._text", oclcEndpoint: "/title/{id}/iteminformation", oclcField: "barcode|id", mappedPath: "librarian-info.record.meta.branches[].branches[key=b]._text", valueField: "item.barcode" }),
  row({ label: "Exemplaar locatie", rawXmlPath: "/aquabrowser/librarian-info/record/meta/branches/branches[@key='a'|'s']", rawJsonPath: "librarian-info.record.meta.branches[].branches[key=a|s]._text", oclcEndpoint: "/title/{id}/iteminformation", oclcField: "branchId|branchName|shelfCode", mappedPath: "librarian-info.record.meta.branches[].branches[key=a|s]._text", transformation: "direct", status: "direct", valueField: "item.branchName" }),
  row({ label: "Exemplaar plaats/signatuur", rawXmlPath: "/aquabrowser/librarian-info/record/meta/branches/branches[@key='m'|'k']", rawJsonPath: "librarian-info.record.meta.branches[].branches[key=m|k]._text", oclcEndpoint: "/title/{id}/iteminformation", oclcField: "callNumber|subLocation|shelfDescription|location", mappedPath: "librarian-info.record.meta.branches[].branches[key=m|k]._text", transformation: "direct", status: "direct", valueField: "item.location" }),
  row({ label: "Beschikbaarheid view", rawXmlPath: "niet in raw XML contract als los statusveld", rawJsonPath: "raw.itemInformation[].effectiveStatus", oclcEndpoint: "/title/{id}/iteminformation", oclcField: "effectiveStatus", mappedPath: "raw.itemInformation[].effectiveStatus", transformation: "direct voor view", status: "viewmodel buiten mapped contract", valueField: "item.status" }),
  row({ label: "Titelbeschikbaarheid/reserveren", rawXmlPath: "geen directe ABL-equivalent in mapped detailcontract", rawJsonPath: "raw.availability", oclcEndpoint: "/branch/1000/titleavailability/{id}?clientType=PUBLIC&holdsCount=true", oclcField: "availability[].status|holdAllowed|holdQueuePosition", mappedPath: "raw.availability", transformation: "direct voor debug/view", status: "viewmodel buiten mapped contract", valueField: "availability.status" }),
];

export function buildDetailMappingRows(raw) {
  return ROWS.map((definition) => ({
    ...definition,
    oclcValue: text(rawValueByField(raw, definition.valueField)),
  }));
}
