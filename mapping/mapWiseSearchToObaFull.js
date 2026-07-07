// Normalize values that may be singletons or arrays in OCLC responses.
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

// Convert optional values to safe text for the OBA JSON contract.
const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

// Return the first non-empty value from a list of possible OCLC fields.
const first = (...values) => values.find((value) => text(value)) || "";

// Validate detail ids before they are emitted into the mapped search result.
function isNumericId(value) {
  return /^\d+$/.test(text(value));
}

// Split an OCLC display name into firstname/lastname attributes required by the existing OBA contract.
function splitName(value = "") {
  const source = text(value);

  if (!source) {
    return { first: "", last: "" };
  }

  if (source.includes(",")) {
    const [last = "", ...rest] = source.split(",");
    return {
      first: text(rest.join(", ")),
      last: text(last),
    };
  }

  const parts = source.split(/\s+/).filter(Boolean);

  return {
    first: text(parts.slice(0, -1).join(" ")),
    last: text(parts.slice(-1).join(" ")),
  };
}

// Resolve the numeric detail id selected by the API from OCLC titlesummary data.
function getDetailId(entry = {}) {
  const id = first(entry.resolvedDetailId, entry.id, entry.title?.id);
  return isNumericId(id) ? text(id) : "";
}

// Pick the best available cover URL from OCLC imageUrls.
function coverImage(title = {}) {
  return first(title.imageUrls?.small, title.imageUrls?.medium, title.imageUrls?.large);
}

// Map OCLC media to the existing OBA formats.format contract node.
function normalizeFormat(title = {}) {
  const media = text(title.media?.description);
  const raw = text(title.media?.icon).toLowerCase();

  if (!media && !raw) return [];

  return [
    {
      _attributes: {
        translation: "Formaat",
        "search-method": "format",
        "search-term": raw,
        "search-type": "searcher",
        raw,
      },
      _text: media,
    },
  ];
}

// Map OCLC subject-like fields to topical-subject contract nodes.
function normalizeSubjects(title = {}) {
  return [
    ...asArray(title.subjects),
    ...asArray(title.subjectSchoolWise),
    title.subjectPim,
  ]
    .map((subject) => text(subject?.description || subject?._text || subject?.label || subject))
    .filter(Boolean)
    .map((value) => ({
      _attributes: {
        translation: "Onderwerp",
        "search-method": "subject",
        "search-term": value,
        "search-type": "fuzzy,precise",
      },
      _text: value,
    }));
}

// Map one OCLC search result to one results.result[] object in the current OBA search JSON contract.
function normalizeResult(entry = {}) {
  const detailId = getDetailId(entry);
  if (!detailId) return null;

  const title = entry.title || {};
  const sourceId = text(entry.sourceId || title.frbrkey || title.id);
  const authorName = text(title.author?.description || title.author);
  const authorParts = splitName(authorName);
  const isbn = text(asArray(title.isbn)[0]);
  const ppn = text(asArray(title.ppn)[0]);
  const language = asArray(title.language)[0] || {};
  const formats = normalizeFormat(title);
  const subjects = normalizeSubjects(title);

  return {
    id: {
      // Technische contractvorming: de OCLC/Wise title id wordt in de oude OBA id-vorm geplaatst
      // omdat dit searchcontract die vorm nog verwacht. De bronwaarde blijft detailId.
      _attributes: {
        nativeid: detailId,
        sourceid: sourceId,
        ds: "library/v/OBA",
        translation: "ID",
        "search-method": "id",
        "search-term": `|oba-catalogus|${detailId}`,
        "search-type": "precise",
      },
      _text: `|oba-catalogus|${detailId}`,
    },

    "detail-page": {
      _text: `/oba-detail/${encodeURIComponent(detailId)}`,
    },

    coverimages: {
      coverimage: {
        _attributes: {
          translation: "Cover",
        },
        _text: coverImage(title),
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
        _attributes: {
          translation: "Korte titel",
        },
        _text: first(title.mainTitle, title.title),
      },
    },

    authors: {
      "main-author": {
        _attributes: {
          "search-method": "author",
          "search-term": authorName,
          "search-type": "searcher",
          translation: "Auteur (hoofd)",
          firstname: authorParts.first,
          lastname: authorParts.last,
          creatortype: authorName ? "person" : "",
          main: "true",
        },
        _text: authorName,
      },
    },

    formats: {
      format: formats,
    },

    publication: {
      year: {
        _attributes: {
          translation: "Publicatiejaar",
          "search-method": "year",
          "search-term": text(title.publicationYear),
          "search-type": "searcher",
        },
        _text: text(title.publicationYear),
      },
      publishers: {
        publisher: {
          _attributes: {
            translation: "Uitgever",
            "search-method": "publisher",
            "search-term": text(title.publisher),
            "search-type": "searcher",
            year: text(title.publicationYear),
            place: "",
          },
          _text: first(title.publisher, title.publicationDetails, title.imprint),
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
        _text: text(language.description || language),
      },
    },

    description: {
      pages: {
        _attributes: {
          translation: "Pagina's",
        },
        _text: text(title.annotationCollation).split(":")[0]?.trim() || "",
      },
      "physical-description": {
        _attributes: {
          translation: "Kenmerken",
        },
        _text: text(title.annotationCollation),
      },
    },

    summaries: {
      summary: {
        _attributes: {
          translation: "Samenvatting",
        },
        _text: first(title.contents, title.contentsSchoolWise, title.summary),
      },
    },

    subjects: {
      "topical-subject": subjects,
    },

    "target-audiences": {
      "target-audience": {
        _attributes: {
          translation: "Doelgroep",
          "search-method": "targetaudience",
          "search-term": text(title.audience?.code),
          "search-type": "searcher",
          raw: text(title.audience?.code),
        },
        _text: text(title.audience?.description),
      },
    },

    identifiers: {
      "isbn-id": {
        _attributes: {
          "search-method": "isbn",
          "search-term": isbn,
          "search-type": "searcher",
          translation: "ISBN",
        },
        _text: isbn,
      },
      "normalized-isbn-id": {
        _attributes: {
          translation: "ISBN (genormaliseerd)",
        },
        _text: isbn,
      },
      "ppn-id": {
        _attributes: {
          "search-method": "ppn",
          "search-term": ppn,
          "search-type": "precise",
          translation: "PICA productienummer",
        },
        _text: ppn,
      },
    },

    "undup-info": {
      _attributes: {
        key: `|oba-catalogus|${detailId}`,
        cnt: "",
        sort: "year",
        frabl: sourceId,
        "frabl-global-count": "",
        "frabl-key1": text(title.title || title.mainTitle),
        "frabl-key2": authorName,
        translation: "Informatie over dubbele items",
        "undup-all-search": "",
      },
    },

    custom: {},
  };
}

// Public mapper for IST search.
// Input: internal raw object with OCLC titlesummary items.
// Output: mapped JSON in the current OBA/GB search contract shape.
export function mapWiseSearchToObaFull(raw = {}) {
  const titles = asArray(raw.titles).filter(
    (entry) => entry?.title && typeof entry.title === "object" && isNumericId(getDetailId(entry))
  );

  const results = titles.map(normalizeResult).filter(Boolean);

  return {
    _attributes: {
      version: "1",
      "detail-level": "Default",
      source: "oclc-wise",
    },

    meta: {
      count: {
        _text: String(raw.total || results.length || 0),
      },
      page: {
        _text: String(raw.page || 1),
      },
      query: {
        _text: text(raw.query),
      },
    },

    feedbacks: {},

    results: {
      result: results,
    },

    suggestions: {
      suggestion: asArray(raw.suggestions)
        .map((item) => ({
          _text:
            typeof item === "string"
              ? item
              : text(item?.text || item?.value || item?.suggestion || item?.term),
        }))
        .filter((item) => item._text),
    },
  };
}
