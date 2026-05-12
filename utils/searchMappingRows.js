const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

function escapeCsv(value) {
  const stringValue = text(value);

  if (/[",\n\r;]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function buildSearchMappingRows(raw = {}, mapped = {}) {
  const results = asArray(mapped?.results?.result);

  return results.map((result, index) => ({
    index: index + 1,
    query: text(raw?.query),
    detailId: text(result?.id?._attributes?.nativeid),
    sourceId: text(result?.id?._attributes?.sourceid),
    detailPage: text(result?.["detail-page"]?._text),
    title: text(result?.titles?.title?._text),
    shortTitle: text(result?.titles?.["short-title"]?._text),
    author: text(result?.authors?.["main-author"]?._text),
    format: asArray(result?.formats?.format)
      .map((item) => text(item?._text))
      .filter(Boolean)
      .join(", "),
    publicationYear: text(result?.publication?.year?._text),
    publisher: text(result?.publication?.publishers?.publisher?._text),
    language: text(result?.languages?.language?._text),
    isbn: text(result?.identifiers?.["isbn-id"]?._text),
    ppn: text(result?.identifiers?.["ppn-id"]?._text),
    summary: text(result?.summaries?.summary?._text),
    subjects: asArray(result?.subjects?.["topical-subject"])
      .map((item) => text(item?._text))
      .filter(Boolean)
      .join(", "),
    cover: text(result?.coverimages?.coverimage?._text),
  }));
}

export function toSearchMappingCsv(rows = []) {
  const headers = [
    "index",
    "query",
    "detailId",
    "sourceId",
    "detailPage",
    "title",
    "shortTitle",
    "author",
    "format",
    "publicationYear",
    "publisher",
    "language",
    "isbn",
    "ppn",
    "summary",
    "subjects",
    "cover",
  ];

  const lines = [
    headers.join(";"),
    ...asArray(rows).map((row) =>
      headers.map((header) => escapeCsv(row?.[header])).join(";")
    ),
  ];

  return lines.join("\n");
}
