const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const first = (...values) => values.find((value) => text(value)) || "";
const singleOrArray = (items) => {
  const values = asArray(items).filter(Boolean);
  if (values.length === 0) return [];
  return values.length === 1 ? values[0] : values;
};

function isNumericId(value) {
  return /^\d+$/.test(text(value));
}

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

function getDetailId(entry = {}) {
  const id = first(entry.resolvedDetailId, entry.id, entry.title?.id);
  return isNumericId(id) ? text(id) : "";
}

function coverImage(title = {}) {
  return first(title.imageUrls?.small, title.imageUrls?.medium, title.imageUrls?.large);
}

function normalizeFormat(title = {}) {
  const mediaText = text(title.media?.description);
  const mediaCode = text(title.media?.code);

  if (!mediaText && !mediaCode) return [];

  return {
    _attributes: {
      translation: "Formaat",
      "search-method": "format",
      "search-term": mediaCode,
      "search-type": "searcher",
      raw: mediaCode,
    },
    _text: mediaText,
  };
}

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

function normalizeGenres(title = {}) {
  const genres = asArray(title.genre)
    .map((genre) => ({
      _attributes: {
        translation: "Genre",
        "search-method": "genre",
        "search-term": text(genre?.description || genre),
        "search-type": "searcher",
      },
      _text: text(genre?.description || genre),
    }))
    .filter((genre) => genre._text);

  if (!genres.length) return undefined;

  return {
    genre: singleOrArray(genres),
  };
}

function normalizeIdentifiers(title = {}) {
  const isbnItems = asArray(title.isbn)
    .map(text)
    .filter(Boolean)
    .map((isbn) => ({
      _attributes: {
        "search-method": "isbn",
        "search-term": isbn,
        "search-type": "searcher",
        translation: "ISBN",
      },
      _text: isbn,
    }));

  const normalizedIsbnItems = asArray(title.isbn)
    .map(text)
    .filter(Boolean)
    .map((isbn) => ({
      _attributes: {
        translation: "ISBN (genormaliseerd)",
      },
      _text: isbn,
    }));

  const ppn = text(asArray(title.ppn)[0]);

  return {
    "isbn-id": singleOrArray(isbnItems),
    "normalized-isbn-id": singleOrArray(normalizedIsbnItems),
    "ppn-id": {
      _attributes: {
        "search-method": "ppn",
        "search-term": ppn,
        "search-type": "precise",
        translation: "PICA productienummer",
      },
      _text: ppn,
    },
  };
}

function normalizeResult(entry = {}) {
  const detailId = getDetailId(entry);
  if (!detailId) return null;

  const title = entry.title || {};
  const sourceId = text(entry.sourceId || title.frbrkey || title.id);
  const authorName = text(title.author?.description || title.author);
  const authorParts = splitName(authorName);
  const language = asArray(title.language)[0] || {};
  const format = normalizeFormat(title);
  const subjects = normalizeSubjects(title);
  const genres = normalizeGenres(title);

  const result = {
    id: {
      _attributes: {
        nativeid: "",
        ds: "",
        translation: "ID",
        "search-method": "",
        "search-term": "",
        "search-type": "",
      },
      _text: detailId,
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
          main: authorName ? "true" : "",
        },
        _text: authorName,
      },
    },

    formats: {
      format,
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
      "topical-subject": singleOrArray(subjects),
    },

    "target-audiences": {
      "target-audience": {
        _attributes: {
          translation: "Doelgroep",
          "search-method": "targetaudience",
          "search-term": "",
          "search-type": "searcher",
          raw: "",
        },
        _text: "",
      },
    },

    frabl: {
      _attributes: {
        translation: "FRBR Nummer (FRABL)",
        "search-method": "frabl",
        "search-term": sourceId,
        "search-type": "searcher",
      },
      _text: sourceId,
    },

    identifiers: normalizeIdentifiers(title),

    "undup-info": {
      _attributes: {
        key: "",
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

  if (genres) result.genres = genres;

  return result;
}

export function mapWiseSearchToObaFull(raw = {}) {
  const titles = asArray(raw.titles).filter(
    (entry) => entry?.title && typeof entry.title === "object" && isNumericId(getDetailId(entry))
  );

  const results = titles.map(normalizeResult).filter(Boolean);

  return {
    _attributes: {
      version: "",
      "before-rendering-time": "",
      "total-time": "",
      "detail-level": "Default",
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
