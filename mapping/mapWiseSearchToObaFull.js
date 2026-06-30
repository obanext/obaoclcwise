import {
  asArray,
  text,
  first,
  textNode,
  attrOnlyNode,
  oneOrMany,
  isNumericId,
  splitName,
  formatRawFromMedia,
  languageCode,
  languageDescription,
  buildRctx,
  buildUndupInfo,
  buildSortOptions,
} from "./aquabrowserCompat.js";

function getDetailId(entry = {}) {
  const id = first(entry.resolvedDetailId, entry.id, entry.title?.id);
  return isNumericId(id) ? text(id) : "";
}

function coverImage(title = {}) {
  return first(title.imageUrls?.small, title.imageUrls?.medium, title.imageUrls?.large);
}

function normalizeFormat(title = {}) {
  const mediaText = text(title.media?.description);
  const raw = formatRawFromMedia(title.media || {});
  if (!mediaText && !raw) return [];

  return [
    textNode(mediaText, {
      translation: "Formaat",
      "search-method": "format",
      "search-term": raw,
      "search-type": "searcher",
      raw,
    }),
  ];
}

function normalizeSubjects(title = {}) {
  return [
    ...asArray(title.subjects),
    ...asArray(title.subjectSchoolWise),
    title.subjectPim,
  ]
    .map((subject) => text(subject?.description || subject?._text || subject?.label || subject))
    .filter(Boolean)
    .map((value) =>
      textNode(value, {
        translation: "Onderwerp",
        "search-method": "subject",
        "search-term": value,
        "search-type": "fuzzy,precise",
      })
    );
}

function normalizeGenre(title = {}) {
  return [...asArray(title.genre), ...asArray(title.genreForms)]
    .map((genre) => text(genre?.description || genre?._text || genre))
    .filter(Boolean)
    .map((value) =>
      textNode(value, {
        translation: "Genre",
        "search-method": "genre",
        "search-term": value,
        "search-type": "searcher",
      })
    );
}

function normalizeResult(entry = {}) {
  const detailId = getDetailId(entry);
  if (!detailId) return null;

  const title = entry.title || {};
  const frabl = first(entry.sourceId, title.frbrkey, title.id, `FRBR:G:${detailId}`);
  const authorName = text(title.author?.description || title.author);
  const authorParts = splitName(authorName);
  const isbn = text(asArray(title.isbn)[0]);
  const ppn = text(asArray(title.ppn)[0]);
  const language = asArray(title.language)[0] || {};
  const formats = normalizeFormat(title);
  const subjects = normalizeSubjects(title);
  const genres = normalizeGenre(title);
  const titleText = text(title.title || title.mainTitle);
  const shortTitle = first(title.mainTitle, title.title);

  const result = {
    id: textNode(`|oba-catalogus|${detailId}`, {
      nativeid: detailId,
      sourceid: frabl,
      ds: "library/v/OBA",
      translation: "ID",
      "search-method": "id",
      "search-term": `|oba-catalogus|${detailId}`,
      "search-type": "precise",
    }),

    frabl: textNode(frabl, {
      translation: "FRBR Nummer (FRABL)",
      "search-method": "frabl",
      "search-term": frabl,
      "search-type": "searcher",
    }),

    "detail-page": textNode(`/oba-detail/${encodeURIComponent(detailId)}`),

    coverimages: {
      coverimage: textNode(coverImage(title), { translation: "Cover" }),
    },

    titles: {
      title: textNode(titleText, {
        translation: "Titel",
        "search-method": "title",
        "search-term": titleText,
        "search-type": "fuzzy",
      }),
      "short-title": textNode(shortTitle, { translation: "Korte titel" }),
    },

    authors: {
      "main-author": textNode(authorName, {
        "search-method": "author",
        "search-term": authorName,
        "search-type": "searcher",
        translation: "Auteur (hoofd)",
        firstname: authorParts.first,
        lastname: authorParts.last,
        creatortype: authorName ? "person" : "",
        main: "true",
      }),
    },

    formats: { format: oneOrMany(formats) },

    publication: {
      year: textNode(text(title.publicationYear), {
        translation: "Publicatiejaar",
        "search-method": "year",
        "search-term": text(title.publicationYear),
        "search-type": "searcher",
      }),
      publishers: {
        publisher: textNode(first(title.publisher, title.publicationDetails, title.imprint), {
          translation: "Uitgever",
          "search-method": "publisher",
          "search-term": text(title.publisher),
          "search-type": "searcher",
          year: text(title.publicationYear),
          place: "",
        }),
      },
    },

    languages: {
      language: textNode(languageDescription(language), {
        translation: "Taal",
        "search-method": "language",
        "search-term": languageCode(language),
        "search-type": "searcher",
        raw: languageCode(language),
      }),
    },

    description: {
      pages: textNode(text(title.annotationCollation).split(":")[0]?.trim() || "", {
        translation: "Pagina's",
      }),
      "physical-description": textNode(text(title.annotationCollation), {
        translation: "Kenmerken",
      }),
    },

    summaries: {
      summary: textNode(first(title.contents, title.contentsSchoolWise, title.summary), {
        translation: "Samenvatting",
      }),
    },

    subjects: { "topical-subject": oneOrMany(subjects) },

    "target-audiences": {
      "target-audience": textNode(text(title.audience?.description), {
        translation: "Doelgroep",
        "search-method": "targetaudience",
        "search-term": text(title.audience?.code),
        "search-type": "searcher",
        raw: text(title.audience?.code),
      }),
    },

    identifiers: {
      "isbn-id": textNode(isbn, {
        "search-method": "isbn",
        "search-term": isbn,
        "search-type": "searcher",
        translation: "ISBN",
      }),
      "normalized-isbn-id": textNode(isbn, {
        translation: "ISBN (genormaliseerd)",
      }),
      "ppn-id": textNode(ppn, {
        "search-method": "ppn",
        "search-term": ppn,
        "search-type": "precise",
        translation: "PICA productienummer",
      }),
    },

    "undup-info": buildUndupInfo({ detailId, frabl, title: titleText, author: authorName }),

    custom: {},
  };

  if (genres.length) result.genres = { genre: oneOrMany(genres) };
  if (asArray(title.titleSeries).length) {
    result.series = {
      "series-title": oneOrMany(
        asArray(title.titleSeries).map((series) =>
          textNode(text(series.description || series), {
            translation: "In de reeks",
            "search-method": "series",
            "search-term": text(series.description || series),
            "search-type": "searcher",
          })
        )
      ),
    };
  }

  return result;
}

function normalizeFacetValue(value = {}) {
  const id = first(value.id, value.code, value.value, value.key, value.description, value.label);
  const label = first(value.translation, value.description, value.label, value.name, id);
  const count = first(value.count, value.total, value.amount, "");
  return attrOnlyNode({ count: text(count), id: text(id), translation: text(label) });
}

function normalizeFacets(raw = {}) {
  const source = raw.searchResponse || {};
  const facetCandidates = asArray(source.facets || source.facet || source.filters || source.refinements);

  const mapped = facetCandidates
    .map((facet) => {
      const id = first(facet.id, facet.code, facet.name, facet.field, facet.key);
      const translation = first(facet.translation, facet.description, facet.label, facet.name, id);
      const values = asArray(facet.value || facet.values || facet.options || facet.items)
        .map(normalizeFacetValue)
        .filter((value) => text(value?._attributes?.id || value?._attributes?.translation));

      if (!id && !translation && !values.length) return null;

      return {
        _attributes: {
          id: text(id),
          translation: text(translation),
          ...(facet.more ? { more: text(facet.more) } : {}),
        },
        value: values,
      };
    })
    .filter(Boolean);

  // Aquabrowser heeft altijd een facets-schil op zoekniveau. Als WISE nog geen
  // facets levert, houden we de schil stabiel en leeg.
  return { facet: mapped };
}

export function mapWiseSearchToObaFull(raw = {}) {
  const titles = asArray(raw.titles).filter(
    (entry) => entry?.title && typeof entry.title === "object" && isNumericId(getDetailId(entry))
  );

  const results = titles.map(normalizeResult).filter(Boolean);
  const activeSort = text(raw.selectedSort || "relevance") || "relevance";

  return {
    _attributes: {
      version: "1",
      "before-rendering-time": "0",
      "total-time": "0",
      "detail-level": "Default",
      source: "oclc-wise",
    },

    meta: {
      count: textNode(String(raw.total || results.length || 0)),
      page: textNode(String(raw.page || 1)),
      rctx: textNode(buildRctx(`${text(raw.query)}:${text(raw.page || 1)}`)),
    },

    feedbacks: {},

    results: { result: results },

    facets: normalizeFacets(raw),

    sort: buildSortOptions(activeSort),
  };
}
