const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);
const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const node = (_text = "", _attributes = {}) => ({
  ...(Object.keys(_attributes).length ? { _attributes } : {}),
  _text: text(_text),
});

const keyedMarc = (tag, key, value) => ({
  [tag]: node(value, { key }),
});

const first = (...values) => values.find((value) => text(value));

export function mapWiseToObaParsedJson({ title, availability, summary, itemInformation }) {
  if (!title || typeof title !== "object") return {};

  const titleText = first(title.title, title.mainTitle);
  const shortTitle = first(title.shortTitle, title.mainTitle, title.title);
  const author = title.author || {};
  const mainAuthorText = text(author.description);
  const collaborators = asArray(title.collaborators);
  const imprint = splitImprint(title.imprint);
  const collation = parseCollation(title.annotationCollation);
  const isbnIds = asArray(title.isbn).map((value) => text(value)).filter(Boolean);
  const ppnIds = asArray(title.ppn).map((value) => text(value)).filter(Boolean);
  const language = first(asArray(title.language)[0]?.description, asArray(title.language)[0]?.code);
  const languageCode = text(asArray(title.language)[0]?.code).toLowerCase();
  const mediaText = text(title.media?.description);
  const titleCategory = text(title.titleCategory);
  const series = asArray(title.titleSeries)[0];
  const subjects = asArray(title.subjects).map((item) => text(item?.description)).filter(Boolean);
  const genres = asArray(title.genres).map((item) => text(item?.description)).filter(Boolean);
  const targetAudience = first(title.targetAudience?.description, title.targetAudienceDescription);
  const mainName = splitName(mainAuthorText);
  const secondaryNames = collaborators.map((item) => splitName(item?.description));
  const secondaryRoles = collaborators.map((item) => text(item?.addition)).filter(Boolean);
  const secondaryStatement = buildSecondaryStatement(collaborators);
  const nbd = extractNbd(title.libraryRecommendation);
  const prodCountry = first(title.productionCountry?.code, title.countryOfPublication?.code, title.countryCode);
  const edition = first(title.edition, title.editionStatement);
  const normalizedIsbnIds = isbnIds.map((value) => value.replace(/^=/, ""));
  const wiseTitleId = first(title.titleId, title.id, title.bibliographicRecordId, title.systemId);
  const obaId = wiseTitleId ? `|wise-title|${wiseTitleId}` : "";
  const bookcode = buildBookcode(title);
  const material = [titleCategory, mediaText ? `[${mediaText}]` : ""].filter(Boolean).join(" ");
  const branches = buildBranches(itemInformation, availability, imprint, title.publicationYear);

  return {
    _attributes: {
      version: "1",
      "detail-level": "Librarian",
      source: "oclc-wise",
      contract: "oba-parsed-json-compatible",
    },
    meta: {},
    id: node(obaId, {
      nativeid: text(wiseTitleId),
      ds: "wise/OCLC",
      translation: "ID",
      "search-method": "id",
      "search-term": obaId,
      "search-type": "precise",
    }),
    frabl: node("", {
      translation: "FRBR Nummer (FRABL)",
      "search-method": "frabl",
      "search-term": "",
      "search-type": "searcher",
    }),
    "detail-page": node(wiseTitleId ? `/oba-detail-parsed-json/${wiseTitleId}` : ""),
    coverimages: {
      coverimage: node(first(title.imageUrls?.large, title.imageUrls?.medium, title.imageUrls?.small), {
        translation: "Cover",
      }),
    },
    titles: {
      title: node(titleText, {
        translation: "Titel",
        "search-method": "title",
        "search-term": titleText,
        "search-type": "fuzzy",
      }),
      "short-title": node(shortTitle, { translation: "Korte titel" }),
    },
    authors: {
      "main-author": node(mainAuthorText, {
        "search-method": "author",
        "search-term": mainAuthorText,
        "search-type": "searcher",
        translation: "Auteur (hoofd)",
        firstname: mainName.first,
        lastname: mainName.last,
        type: text(author.addition),
        "localized-type": text(author.roleDescription),
        creatortype: "person",
        main: "true",
      }),
      author: collaborators.map((item) => node(item.description, {
        "search-method": "author",
        "search-term": text(item.description),
        "search-type": "searcher",
        translation: "Auteur",
        type: text(item.addition),
        "localized-type": text(item.roleDescription),
      })),
    },
    formats: {
      format: node(mediaText, {
        translation: "Formaat",
        "search-method": "format",
        "search-term": text(title.media?.code || mediaText),
        "search-type": "searcher",
        raw: text(title.media?.code || mediaText),
      }),
    },
    identifiers: {
      "isbn-id": isbnIds.map((value) => node(value, {
        "search-method": "isbn",
        "search-term": value,
        "search-type": "searcher",
        translation: "ISBN",
      })),
      "normalized-isbn-id": normalizedIsbnIds.map((value) => node(value, {
        translation: "ISBN (genormaliseerd)",
      })),
      "ppn-id": node(ppnIds[0] || "", {
        "search-method": "ppn",
        "search-term": ppnIds[0] || "",
        "search-type": "precise",
        translation: "PICA productienummer",
      }),
    },
    publication: {
      year: node(text(title.publicationYear), {
        translation: "Publicatiejaar",
        "search-method": "year",
        "search-term": text(title.publicationYear),
        "search-type": "searcher",
      }),
      publishers: {
        publisher: node(imprint.publisher, {
          translation: "Uitgever",
          "search-method": "publisher",
          "search-term": imprint.publisher,
          "search-type": "searcher",
          year: text(title.publicationYear),
          place: imprint.place,
        }),
      },
      editions: {
        edition: node(edition, { translation: "Editie" }),
      },
    },
    languages: {
      language: node(language, {
        translation: "Taal",
        "search-method": "language",
        "search-term": languageCode,
        "search-type": "searcher",
        raw: languageCode,
      }),
    },
    subjects: {
      "topical-subject": subjects.map((value) => node(value, {
        translation: "Onderwerp",
        "search-method": "subject",
        "search-term": value,
        "search-type": "fuzzy,precise",
      })),
    },
    genres: {
      genre: node(genres[0] || "", {
        translation: "Genre",
        "search-method": "genre",
        "search-term": genres[0] || "",
        "search-type": "searcher",
      }),
    },
    description: {
      pages: node(collation.pages, { translation: "Pagina's" }),
      "physical-description": node(collation.full, { translation: "Kenmerken" }),
    },
    summaries: {
      summary: node(first(title.contents, summary?.contents, summary?.summary), { translation: "Samenvatting" }),
    },
    "target-audiences": {
      "target-audience": node(targetAudience, {
        translation: "Doelgroep",
        "search-method": "targetaudience",
        "search-term": text(title.targetAudience?.code || targetAudience),
        "search-type": "searcher",
        raw: text(title.targetAudience?.code || targetAudience),
      }),
    },
    series: {
      "series-title": node(series?.description, {
        translation: "In de reeks",
        "search-method": "series",
        "search-term": text(series?.description),
        "search-type": "searcher",
        volume: text(series?.volume || series?.part || title.seriesVolume),
      }),
    },
    ratings: {},
    "librarian-info": {
      _attributes: { translation: "Informatie voor bibliothecarissen" },
      info: {
        _attributes: {
          material: text(title.media?.code || title.titleCategory),
          language: languageCode,
        },
      },
      record: {
        marc: buildMarc({
          isbnIds,
          ppnIds,
          bookcode,
          languageCode,
          language,
          titleText,
          material,
          mainAuthorText,
          secondaryStatement,
          imprint,
          publicationYear: title.publicationYear,
          collation,
          series,
          author,
          mainName,
          subjects,
          genres,
          collaborators,
          secondaryNames,
          secondaryRoles,
          nbd,
          summary: first(title.contents, summary?.contents, summary?.summary),
          prodCountry,
          edition,
        }),
        meta: {
          branches,
        },
      },
    },
    "undup-info": {
      _attributes: {
        key: obaId,
        cnt: "0",
        sort: "year",
        translation: "Informatie over dubbele items",
      },
    },
    custom: {},
    branches: buildBranchBlocks(itemInformation),
    services: {},
    debug: {
      source: "OCLC/Wise",
      mappedAs: "OBA parsed JSON-compatible detail model",
      derivedFields: ["detail-page", "librarian-info.record.marc", "librarian-info.record.meta.branches"],
      unmappedFields: ["frabl"],
    },
  };
}

function splitName(value = "") {
  const source = text(value);
  if (!source.includes(",")) return { last: source, first: "" };
  const [last = "", ...rest] = source.split(",");
  return { last: text(last), first: text(rest.join(",")) };
}

function splitImprint(value = "") {
  const source = text(value);
  const [placePart = "", restPart = ""] = source.split(":");
  const rest = text(restPart);
  const yearMatch = rest.match(/(\[?\d{4}\]?)/);
  return {
    place: text(placePart),
    publisher: text(rest.replace(/,?\s*[\[(]?\d{4}[\])]?.*$/, "")),
    year: yearMatch ? yearMatch[1] : "",
  };
}

function parseCollation(value = "") {
  const source = text(value);
  const [pages = "", rest = ""] = source.split(":");
  const [illustrations = "", size = ""] = rest.split(";");
  return {
    pages: text(pages),
    illustrations: text(illustrations),
    size: text(size),
    full: source,
  };
}

function buildSecondaryStatement(collaborators = []) {
  return asArray(collaborators)
    .map((item) => {
      const role = text(item?.roleDescription || item?.addition);
      const name = text(item?.description);
      if (role && name) return `${role} ${name}`;
      return name || role;
    })
    .filter(Boolean)
    .join(" en ");
}

function extractNbd(value = "") {
  return text(value).match(/\b\d{10}\b/)?.[0] || "";
}

function buildBookcode(title = {}) {
  const classification = text(asArray(title.classification)[0]?.description);
  const authorLast = splitName(title.author?.description).last.toLowerCase();
  if (!classification || !authorLast) return "";
  return `AJ.${classification}-${authorLast.slice(0, 4)}`;
}

function buildMarc(input) {
  const df010 = input.isbnIds.map((value) => keyedMarc("df010", "a", value));
  const df630 = input.subjects.map((value) => keyedMarc("df630", "a", value));
  const df702 = input.collaborators.map((item, index) => ({
    df702: [
      node(item.addition, { key: "4" }),
      node(input.secondaryNames[index]?.last, { key: "a" }),
      node(input.secondaryNames[index]?.first, { key: "b" }),
      node(item.roleDescription, { key: "z" }),
      node(item.description, { key: "ab" }),
    ],
  }));

  return {
    _attributes: { src: "wise" },
    df010,
    df020: keyedMarc("df020", "b", input.ppnIds[0] || ""),
    df059: keyedMarc("df059", "j", input.bookcode),
    df101: keyedMarc("df101", "a", input.languageCode && input.language ? `${input.languageCode} [${input.language}]` : input.language),
    df200: {
      df200: [
        node(input.titleText, { key: "a" }),
        node(input.material, { key: "b" }),
        node(input.mainAuthorText, { key: "f" }),
        node(input.secondaryStatement, { key: "g" }),
      ],
    },
    df210: {
      df210: [
        node(input.imprint.place, { key: "a" }),
        node(input.imprint.publisher, { key: "c" }),
        node(input.publicationYear, { key: "d" }),
      ],
    },
    df215: {
      df215: [
        node(input.collation.pages, { key: "a" }),
        node(input.collation.illustrations, { key: "c" }),
        node(input.collation.size, { key: "d" }),
      ],
    },
    df520: {
      df520: [
        node(input.series?.description, { key: "a" }),
        node(input.series?.volume || input.series?.part, { key: "v" }),
      ],
    },
    df700: {
      df700: [
        node(input.author?.addition, { key: "4" }),
        node(input.mainName.last, { key: "a" }),
        node(input.mainName.first, { key: "b" }),
        node(input.author?.roleDescription, { key: "z" }),
        node(input.mainAuthorText, { key: "ab" }),
      ],
    },
    df630,
    df691: keyedMarc("df691", "a", input.genres[0] || ""),
    df702,
    df014: keyedMarc("df014", "a", input.nbd),
    df320: keyedMarc("df320", "a", input.summary),
    df044: keyedMarc("df044", "a", input.prodCountry),
    df205: keyedMarc("df205", "a", input.edition),
  };
}

function buildBranches(items = [], availability = {}, imprint = {}, publicationYear = "") {
  return asArray(items).map((item) => {
    const status = mapStatus(item.effectiveStatus || item.status);
    const dueDate = first(item.dueDate, item.expectedReturnDate, item.returnDate);
    const availabilityText = dueDate && status === "Uitgeleend" ? `Uitgeleend tot ${formatDate(dueDate)}` : status;
    const branchId = first(item.branchId, item.branchCode, item.branchName);
    const place = first(item.shelfDescription, item.subLocation, item.locationDescription);
    const shelf = first(item.callNumber, item.shelfMark);
    const publication = [imprint.publisher, publicationYear].filter(Boolean).join(", ");
    const compact = [
      item.barcode,
      item.networkId,
      branchId,
      item.collectionCode,
      place,
      shelf,
      dueDate ? formatDate(dueDate, "/") : "-",
      item.reservationStatus || "-",
      status === "Niet beschikbaar" ? "NB" : "-",
      "-",
      item.subLocation || "",
      "",
      "",
      "",
      "",
    ].map((value) => text(value) || "-").join("^");

    return {
      branches: [
        node(compact, { key: "p" }),
        node(item.barcode, { key: "b" }),
        node(item.collectionCode || item.branchName, { key: "s" }),
        node(place, { key: "m" }),
        node(shelf, { key: "k" }),
        node(branchId, { key: "a" }),
        node(item.branchName, { key: "branchName" }),
        node(item.branchName, { key: "locationName" }),
        node(publication, { key: "publication" }),
        node(availabilityText, { key: "status" }),
        node(availabilityText, { key: "availability" }),
      ],
    };
  });
}

function buildBranchBlocks(items = []) {
  const unique = new Map();
  asArray(items).forEach((item) => {
    const id = text(item.branchId || item.branchCode || item.branchName);
    const name = text(item.branchName || id);
    if (id && !unique.has(id)) unique.set(id, name);
  });

  const directory = {
    branch: [...unique.entries()].map(([id, name]) => ({
      _attributes: { id, translation: name },
    })),
  };

  const detailed = {
    branch: [...unique.entries()].map(([id, name]) => ({
      _attributes: { id, translation: name },
      holding: {
        _attributes: { id, name },
      },
    })),
  };

  return [directory, detailed];
}

function mapStatus(status) {
  switch (text(status).toUpperCase()) {
    case "AVAILABLE":
      return "Aanwezig";
    case "ON_LOAN":
    case "LOANED":
      return "Uitgeleend";
    case "MISSING":
    case "NOT_AVAILABLE":
    case "UNAVAILABLE":
      return "Niet beschikbaar";
    case "RESERVED":
    case "ON_HOLD":
      return "Gereserveerd";
    default:
      return text(status) || "Onbekend";
  }
}

function formatDate(value, separator = "-") {
  const source = text(value);
  if (!source) return "";
  const match = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return [match[3], match[2], match[1]].join(separator);
  return source.replaceAll("/", separator).replaceAll("-", separator);
}
