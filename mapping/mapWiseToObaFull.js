const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const first = (...values) => values.find((value) => text(value)) || "";

// Tijdelijke pre-migratie selectie: Amstelland testbibliotheek.
const ALLOWED_BRANCHES = ["1000", "1001", "1002", "1003", "1004"];

export function mapWiseToObaFull({ title, titleInfo, availability, itemInformation }) {
  if (!title || typeof title !== "object") return {};

  const titleRecord = asArray(titleInfo)[0] || {};
  const author = title.author || {};
  const collaborators = asArray(title.collaborators);
  const subjects = asArray(title.subjects);
  const isbn = asArray(title.isbn).map(text).filter(Boolean);
  const ppn = asArray(title.ppn).map(text).filter(Boolean);
  const genre = asArray(title.genre)[0] || {};
  const language = asArray(title.language)[0] || {};
  const series = asArray(title.titleSeries)[0] || {};
  const collation = parseCollation(title.annotationCollation);
  const imprint = parseImprint(title.imprint, title.publicationYear);
  const authorName = parseName(author.description);
  const materialRaw = mediaRaw(title.media?.code, title.media?.description);
  const targetAudience = targetAudienceFromTitle(title);
  const nbd = extractLid(titleRecord.momkeys) || extractNbd(title.libraryRecommendation);
  const bookCode = buildBookCode(title, authorName.lastName);
  const formattedAuthor = formatDisplayAuthor(authorName, author.description);
  const secondaryStatement = buildSecondaryResponsibility(collaborators);

  return {
    _attributes: {
      version: "1",
      "before-rendering-time": "",
      "total-time": "",
      "detail-level": "Librarian",
    },

    meta: {
      rctx: { _text: "" },
    },

    id: {
      _attributes: {
        nativeid: text(title.id),
        ds: "library/v/OBA",
        translation: "ID",
        "search-method": "id",
        "search-term": title.id ? `|oba-catalogus|${title.id}` : "",
        "search-type": "precise",
      },
      _text: title.id ? `|oba-catalogus|${title.id}` : "",
    },

    frabl: {
      _attributes: {
        translation: "FRBR Nummer (FRABL)",
        "search-method": "frabl",
        "search-term": text(title.frbrkey || title.frbrKey),
        "search-type": "searcher",
      },
      _text: text(title.frbrkey || title.frbrKey),
    },

    "detail-page": {
      _text: buildDetailPageUrl(title, formattedAuthor),
    },

    coverimages: {
      coverimage: {
        _attributes: { translation: "Cover" },
        _text: text(title.imageUrls?.medium || title.imageUrls?.large || title.imageUrls?.small),
      },
    },

    titles: {
      title: {
        _attributes: {
          translation: "Titel",
          "search-method": "title",
          "search-term": text(title.title || title.mainTitle),
          "search-type": "fuzzy",
        },
        _text: text(title.title || title.mainTitle),
      },
      "short-title": {
        _attributes: { translation: "Korte titel" },
        _text: text(title.mainTitle || title.title),
      },
    },

    authors: {
      "main-author": {
        _attributes: {
          "search-method": "author",
          "search-term": formattedAuthor,
          "search-type": "searcher",
          translation: "Auteur (hoofd)",
          firstname: authorName.firstName,
          lastname: authorName.lastName,
          preposition: authorName.preposition,
          type: text(author.addition),
          "localized-type": localizedRole(author.addition),
          creatortype: author.type === "AUTHOR" ? "person" : "unknown",
          main: "true",
        },
        _text: formattedAuthor,
      },
      author: collaborators.map((collaborator) => ({
        _attributes: {
          "search-method": "author",
          "search-term": formatDisplayAuthor(parseName(collaborator.description), collaborator.description),
          "search-type": "searcher",
          translation: "Auteur",
          type: text(collaborator.addition),
          "localized-type": localizedRole(collaborator.addition),
          creatortype: collaborator.type === "AUTHOR" ? "person" : "unknown",
        },
        _text: formatDisplayAuthor(parseName(collaborator.description), collaborator.description),
      })),
    },

    formats: {
      format: {
        _attributes: {
          translation: "Formaat",
          "search-method": "format",
          "search-term": materialRaw,
          "search-type": "searcher",
          raw: materialRaw,
        },
        _text: text(title.media?.description),
      },
    },

    identifiers: {
      "isbn-id": isbn.map((value) => ({
        _attributes: {
          "search-method": "isbn",
          "search-term": value.startsWith("=") ? value : `=${value}`,
          "search-type": "searcher",
          translation: "ISBN",
        },
        _text: value.startsWith("=") ? value : `=${value}`,
      })),
      "normalized-isbn-id": isbn.map((value) => ({
        _attributes: { translation: "ISBN (genormaliseerd)" },
        _text: value.replace(/^=/, ""),
      })),
      "ppn-id": {
        _attributes: {
          "search-method": "ppn",
          "search-term": text(ppn[0] || titleRecord.ppn),
          "search-type": "precise",
          translation: "PICA productienummer",
        },
        _text: text(ppn[0] || titleRecord.ppn),
      },
    },

    publication: {
      year: {
        _attributes: {
          translation: "Publicatiejaar",
          "search-method": "year",
          "search-term": text(title.publicationYear || titleRecord.publicationYear || imprint.year),
          "search-type": "searcher",
        },
        _text: text(title.publicationYear || titleRecord.publicationYear || imprint.year),
      },
      publishers: {
        publisher: {
          _attributes: {
            translation: "Uitgever",
            "search-method": "publisher",
            "search-term": imprint.publisher,
            "search-type": "searcher",
            year: text(title.publicationYear || titleRecord.publicationYear || imprint.year),
            place: imprint.place,
          },
          _text: imprint.publisher,
        },
      },
      editions: {
        edition: {
          _attributes: { translation: "Editie" },
          _text: text(title.annotationEdition || asArray(availability)[0]?.edition),
        },
      },
    },

    languages: {
      language: {
        _attributes: {
          translation: "Taal",
          "search-method": "language",
          "search-term": text(language.code).toLowerCase(),
          "search-type": "searcher",
          raw: text(language.code).toLowerCase(),
        },
        _text: text(language.description),
      },
    },

    subjects: {
      "topical-subject": subjects.map((subject) => ({
        _attributes: {
          translation: "Onderwerp",
          "search-method": "subject",
          "search-term": text(subject.description),
          "search-type": "fuzzy,precise",
        },
        _text: text(subject.description),
      })),
    },

    genres: {
      genre: {
        _attributes: {
          translation: "Genre",
          "search-method": "genre",
          "search-term": text(genre.description),
          "search-type": "searcher",
        },
        _text: text(genre.description),
      },
    },

    description: {
      pages: {
        _attributes: { translation: "Pagina's" },
        _text: collation.pages,
      },
      "physical-description": {
        _attributes: { translation: "Kenmerken" },
        _text: collation.full,
      },
    },

    summaries: {
      summary: {
        _attributes: { translation: "Samenvatting" },
        _text: text(title.contents || titleRecord.description),
      },
    },

    "target-audiences": {
      "target-audience": {
        _attributes: {
          translation: "Doelgroep",
          "search-method": "targetaudience",
          "search-term": targetAudience.searchTerm,
          "search-type": "searcher",
          raw: targetAudience.raw,
        },
        _text: targetAudience.text,
      },
    },

    series: {
      "series-title": {
        _attributes: {
          translation: "In de reeks",
          "search-method": "series",
          "search-term": text(series.description),
          "search-type": "searcher",
          volume: text(series.addition || series.number),
        },
        _text: text(series.description),
      },
    },

    ratings: {},

    "librarian-info": {
      _attributes: { translation: "Informatie voor bibliothecarissen" },
      info: {
        _attributes: {
          "import-time": "",
          material: buildInfoMaterial(title),
          language: text(language.code).toLowerCase(),
          debug: "",
        },
      },
      record: {
        "undup-info": buildUndupInfo(title, formattedAuthor),
        marc: buildMarc({
          title,
          titleRecord,
          author,
          authorName,
          formattedAuthor,
          collaborators,
          subjects,
          genre,
          language,
          series,
          isbn,
          ppn,
          imprint,
          collation,
          nbd,
          bookCode,
          secondaryStatement,
        }),
        meta: {
          branches: buildBranches(itemInformation),
        },
      },
    },

    "undup-info": buildUndupInfo(title, formattedAuthor),

    custom: {},
    branches: buildTopBranches(itemInformation),
    services: {},
  };
}

function buildUndupInfo(title = {}, formattedAuthor = "") {
  const frabl = text(title.frbrkey || title.frbrKey);
  return {
    _attributes: {
      key: title.id ? `|oba-catalogus|${title.id}` : "",
      cnt: "0",
      sort: "year",
      frabl,
      "frabl-global-count": "1",
      "frabl-key1": text(title.title || title.mainTitle).toLowerCase(),
      "frabl-key2": text(formattedAuthor).toLowerCase(),
      translation: "Informatie over dubbele items",
      "undup-all-search": frabl ? `frabl=0x${frabl}MFFFFFF` : "",
    },
  };
}

function buildMarc({
  title,
  titleRecord,
  author,
  authorName,
  formattedAuthor,
  collaborators,
  subjects,
  genre,
  language,
  series,
  isbn,
  ppn,
  imprint,
  collation,
  nbd,
  bookCode,
  secondaryStatement,
}) {
  return {
    _attributes: { src: "v" },
    df010: isbn.map((value) => ({ df010: marcNode("a", value.startsWith("=") ? value : `=${value}`) })),
    df020: { df020: marcNode("b", text(ppn[0] || titleRecord.ppn)) },
    df059: { df059: marcNode("j", bookCode) },
    df101: { df101: marcNode("a", publicationLanguage(language)) },
    df200: {
      df200: [
        marcNode("a", text(title.mainTitle || title.title)),
        marcNode("b", buildMaterial(title)),
        marcNode("f", formattedAuthor),
        marcNode("g", secondaryStatement),
      ],
    },
    df210: {
      df210: [
        marcNode("a", imprint.place),
        marcNode("c", imprint.publisher),
        marcNode("d", text(title.publicationYear || titleRecord.publicationYear || imprint.year)),
      ],
    },
    df215: {
      df215: [
        marcNode("a", collation.pages),
        marcNode("c", collation.illustrations),
        marcNode("d", collation.size),
        marcNode("e", collation.attachment),
      ],
    },
    df520: {
      df520: [
        marcNode("a", text(series.description)),
        marcNode("v", text(series.addition || series.number)),
      ],
    },
    df700: {
      df700: [
        marcNode("4", text(author.addition)),
        marcNode("a", authorName.lastName),
        marcNode("b", authorName.firstNameWithPreposition),
        marcNode("z", localizedRole(author.addition)),
        marcNode("ab", text(author.description)),
        marcNode("ap", "-1"),
      ],
    },
    df630: subjects.map((subject) => ({ df630: marcNode("a", text(subject.description)) })),
    df691: { df691: marcNode("a", text(genre.description).toLowerCase()) },
    df702: collaborators.map((collaborator) => {
      const name = parseName(collaborator.description);
      return {
        df702: [
          marcNode("4", text(collaborator.addition)),
          marcNode("a", name.lastName),
          marcNode("b", name.firstNameWithPreposition),
          marcNode("z", localizedRole(collaborator.addition)),
          marcNode("ab", text(collaborator.description)),
          marcNode("ap", "-1"),
        ],
      };
    }),
    df014: { df014: marcNode("a", nbd) },
    df320: { df320: marcNode("a", text(title.contents || titleRecord.description)) },
    df044: { df044: marcNode("a", prodCountry(title)) },
    df205: { df205: marcNode("a", text(title.annotationEdition)) },
  };
}

function marcNode(key, value) {
  return {
    _attributes: { key },
    _text: text(value),
  };
}

function parseName(description = "") {
  const source = text(description);
  if (!source) {
    return { lastName: "", firstName: "", preposition: "", firstNameWithPreposition: "" };
  }

  if (!source.includes(",")) {
    const parts = source.split(/\s+/).filter(Boolean);
    const lastName = parts.pop() || "";
    const firstNameWithPreposition = parts.join(" ");
    const { firstName, preposition } = splitFirstNamePreposition(firstNameWithPreposition);
    return { lastName, firstName, preposition, firstNameWithPreposition };
  }

  const [lastName = "", ...firstParts] = source.split(",");
  const firstNameWithPreposition = text(firstParts.join(","));
  const { firstName, preposition } = splitFirstNamePreposition(firstNameWithPreposition);
  return {
    lastName: text(lastName),
    firstName,
    preposition,
    firstNameWithPreposition,
  };
}

function splitFirstNamePreposition(value = "") {
  const source = text(value);
  const match = source.match(/^(.+?)\s+(van|de|den|der|van de|van der|van den)$/i);
  if (!match) return { firstName: source, preposition: "" };
  return { firstName: text(match[1]), preposition: text(match[2]) };
}

function formatDisplayAuthor(name, fallback = "") {
  if (!text(fallback)) return "";
  if (text(fallback).includes(",")) {
    const suffix = [name.preposition, name.lastName].filter(Boolean).join(" ");
    return [name.firstName, suffix].filter(Boolean).join(" ");
  }
  return text(fallback);
}

function buildSecondaryResponsibility(collaborators = []) {
  const illustrators = asArray(collaborators).filter((item) => text(item.addition) === "ill");
  if (illustrators.length) {
    return `tekeningen ${illustrators.map((item) => formatDisplayAuthor(parseName(item.description), item.description)).filter(Boolean).join(" en ")}`;
  }

  return asArray(collaborators)
    .map((item) => formatDisplayAuthor(parseName(item.description), item.description))
    .filter(Boolean)
    .join(", ");
}

function parseImprint(imprint = "", fallbackYear = "") {
  const source = text(imprint);
  const [place = "", rest = ""] = source.split(":");
  const yearMatch = rest.match(/(\d{4})/);
  return {
    place: text(place),
    publisher: text(rest.replace(/,?\s*[©\[\(]?\d{4}[\]\)]?.*$/, "")),
    year: text(yearMatch?.[1] || fallbackYear),
  };
}

function parseCollation(value = "") {
  const full = normalizeCollation(value);
  const [pagesPart = "", rest = ""] = full.split(":");
  const [illustrationsPart = "", sizeAttachmentPart = ""] = rest.split(";");
  const [sizePart = "", attachmentPart = ""] = sizeAttachmentPart.split("+");

  return {
    full,
    pages: text(pagesPart),
    illustrations: text(illustrationsPart),
    size: text(sizePart),
    attachment: text(attachmentPart),
  };
}

function normalizeCollation(value = "") {
  return text(value).replace(/\s+:\s+/g, ": ").replace(/\s+;\s+/g, " ; ").replace(/\s+\+\s+/g, " + ");
}

function buildBookCode(title, authorLastName) {
  const explicit = text(asArray(title.localCallNumbers)[0]?.description || asArray(title.localCallNumbers)[0]);
  if (explicit) return explicit;

  const callNumber = text(title.signature?.[0]?.description || title.readingLevel || title.targetGroup);
  if (callNumber && authorLastName) return `${callNumber}-${authorLastName}`;
  if (authorLastName) return `A-${authorLastName.toLowerCase()}`;
  return "";
}

function buildMaterial(title) {
  const category = text(title.titleCategory || title.youthMaterial?.code);
  const media = text(title.media?.description);
  if (!category && !media) return "";
  return `${category} [${media}]`.trim();
}

function buildInfoMaterial(title) {
  const raw = mediaRaw(title.media?.code, title.media?.description);
  if (!raw) return "";
  return raw === "book" ? "booNormalBook;matBook" : raw;
}

function publicationLanguage(language = {}) {
  const code = text(language.code).toLowerCase();
  const description = text(language.description);
  if (code && description) return `${code} [${description}]`;
  return description || code;
}

function mediaRaw(code = "", description = "") {
  const normalizedCode = text(code).toUpperCase();
  const normalizedDescription = text(description).toLowerCase();
  if (normalizedCode === "BOE" || normalizedDescription === "boek") return "book";
  return normalizedCode.toLowerCase() || normalizedDescription;
}

function localizedRole(role = "") {
  switch (text(role)) {
    case "aut": return "Auteur";
    case "ill": return "Illustrator";
    case "trl": return "Vertaler";
    case "edt": return "Redacteur";
    default: return text(role);
  }
}

function targetAudienceFromTitle(title = {}) {
  if (title.youth) {
    return { text: "Jeugd", searchTerm: "ageYouth", raw: "ageYouth" };
  }
  if (title.adult) {
    return { text: "Volwassenen", searchTerm: "ageAdult", raw: "ageAdult" };
  }
  return { text: text(title.audience?.description), searchTerm: text(title.audience?.code), raw: text(title.audience?.code) };
}

function extractLid(momkeys = "") {
  return text(momkeys).match(/(?:^|;)lid=([^;]+)/)?.[1] || "";
}

function extractNbd(value = "") {
  return text(value).match(/\b\d{10}\b/)?.[0] || "";
}

function prodCountry(title = {}) {
  const source = text(title.source).toLowerCase();
  if (source === "nbd") return "ne";
  return "";
}

function buildDetailPageUrl(title = {}, author = "") {
  const id = text(title.id);
  if (!id) return "";
  const safeAuthor = encodePathPart(author || "onbekend");
  const safeTitle = encodePathPart(title.title || title.mainTitle || "titel");
  const safeFormat = encodePathPart(title.media?.description || "Materiaal");
  return `http://zoeken.oba.nl/detail/${safeAuthor}/${safeTitle}/${safeFormat}/?itemid=%7coba-catalogus%7c${id}`;
}

function encodePathPart(value = "") {
  return text(value).replace(/\s+/g, "-").replace(/[^a-zA-Z0-9À-ž_-]/g, "");
}

function buildBranches(items = []) {
  return asArray(items)
    .filter((item) => ALLOWED_BRANCHES.includes(String(item.branchId)))
    .map((item) => {
      const branchArea = text(item.branchArea || item.branchId);
      const shelfCode = text(item.shelfCode || item.location);
      const callNumber = text(item.callNumber || item.headWord);
      const location = text(item.subLocation || item.shelfDescription || item.location);
      const returnDate = formatReturnDate(item.returnDate);
      const p = [
        text(item.barcode || item.id),
        "REGIONRD",
        text(item.branchId),
        shelfCode,
        callNumber,
        location,
        returnDate || "-",
        "-",
        "-",
        "-",
        text(item.location),
        "",
        "",
        "",
        "",
      ].join("^");

      return {
        branches: [
          branchNode("p", p),
          branchNode("b", text(item.barcode || item.id)),
          branchNode("s", shelfCode),
          branchNode("m", callNumber),
          branchNode("k", location),
          branchNode("a", branchArea),
          branchNode("rss", normalizeDate(item.itemCreationDate)),
        ],
      };
    });
}

function branchNode(key, value) {
  return {
    _attributes: { key },
    _text: text(value),
  };
}

function formatReturnDate(value = "") {
  const source = text(value);
  const match = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function normalizeDate(value = "") {
  return text(value).replaceAll("-", "");
}

function buildTopBranches(items = []) {
  const branchNames = new Map();
  asArray(items)
    .filter((item) => ALLOWED_BRANCHES.includes(String(item.branchId)))
    .forEach((item) => {
      const name = text(item.branchName || item.branchId);
      if (name) branchNames.set(name, item.branchId);
    });

  return [
    {
      branch: Array.from(branchNames.entries()).map(([name, id]) => ({
        _attributes: {
          id: `/root/OBA/${id}`,
          translation: name,
        },
      })),
    },
    { branch: [] },
  ];
}

export function mapWiseItemStatus(status) {
  switch (text(status)) {
    case "AVAILABLE": return "Aanwezig";
    case "ON_LOAN": return "Uitgeleend";
    case "MISSING": return "Niet beschikbaar";
    case "IN_TRANSIT":
    case "IN_TRANSIT_LINKED":
    case "SIP_CHECK_IN": return "Onderweg";
    default: return text(status) || "Onbekend";
  }
}
