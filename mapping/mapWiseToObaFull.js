import {
  asArray,
  text,
  first,
  textNode,
  attrOnlyNode,
  oneOrMany,
  splitName,
  formatRawFromMedia,
  languageCode,
  languageDescription,
  buildRctx,
  buildUndupInfo,
} from "./aquabrowserCompat.js";

const ALLOWED_BRANCHES = ["1000", "1001", "1002", "1003", "1004"];

export function mapWiseToObaFull({ title, availability, summary, itemInformation }) {
  if (!title || typeof title !== "object") return buildEmptyDetailWrapper();

  const detailId = text(title.id);
  const frabl = first(title.frbrkey, title.cWiseId, `FRBR:G:${detailId}`);
  const author = title.author || {};
  const mainAuthorName = text(author.description);
  const mainAuthorParts = splitName(mainAuthorName);
  const collaborators = asArray(title.collaborators);
  const titleText = text(title.title || [title.mainTitle, title.subtitle].filter(Boolean).join(" : "));
  const shortTitle = first(title.mainTitle, title.title);
  const isbn = text(asArray(title.isbn)[0]);
  const ppn = text(asArray(title.ppn)[0]);
  const language = asArray(title.language)[0] || {};
  const originalTitle = first(title.titleTranslationOf?.description, asArray(title.titleOriginalTitle)[0]?.description, asArray(title.titleOriginalTitle)[0]);
  const genres = buildGenres(title);
  const subjects = buildSubjects(title);
  const series = buildSeries(title);
  const notes = buildNotes(title);
  const branchMeta = buildMarcBranches(itemInformation);
  const topLevelBranches = buildTopLevelBranches(itemInformation);

  const mapped = {
    _attributes: {
      version: "1",
      "before-rendering-time": "0",
      "total-time": "0",
      "detail-level": "Librarian",
      source: "oclc-wise",
    },

    meta: {
      rctx: textNode(buildRctx(detailId)),
    },

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
      coverimage: textNode(first(title.imageUrls?.large, title.imageUrls?.medium, title.imageUrls?.small), {
        translation: "Cover",
      }),
    },

    titles: {
      title: textNode(titleText, {
        translation: "Titel",
        "search-method": "title",
        "search-term": titleText,
        "search-type": "fuzzy",
      }),
      "short-title": textNode(shortTitle, { translation: "Korte titel" }),
      ...(originalTitle ? { "origin-title": textNode(originalTitle, { translation: "Oorspr. titel" }) } : {}),
    },

    authors: {
      "main-author": textNode(mainAuthorParts.display || mainAuthorName, {
        "search-method": "author",
        "search-term": mainAuthorParts.display || mainAuthorName,
        "search-type": "searcher",
        translation: "Auteur (hoofd)",
        firstname: mainAuthorParts.first,
        lastname: mainAuthorParts.last,
        creatortype: mainAuthorName ? "person" : "",
        main: "true",
      }),
      ...(collaborators.length ? { author: oneOrMany(collaborators.map(buildContributorNode)) } : {}),
    },

    formats: {
      format: textNode(text(title.media?.description), {
        translation: "Formaat",
        "search-method": "format",
        "search-term": formatRawFromMedia(title.media || {}),
        "search-type": "searcher",
        raw: formatRawFromMedia(title.media || {}),
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

    eresources: buildEResources(title),

    publication: {
      year: textNode(text(title.publicationYear), {
        translation: "Publicatiejaar",
        "search-method": "year",
        "search-term": text(title.publicationYear),
        "search-type": "searcher",
      }),
      publishers: {
        publisher: textNode(extractPublisher(title.imprint), {
          translation: "Uitgever",
          "search-method": "publisher",
          "search-term": extractPublisher(title.imprint),
          "search-type": "searcher",
          year: text(title.publicationYear),
          place: extractPlace(title.imprint),
        }),
      },
      editions: {
        edition: textNode(first(title.annotationEdition, title.edition), { translation: "Editie" }),
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
      ...(title.titleTranslationOf || title.titleOriginalTitle?.length
        ? { "original-language": textNode("Engels", { translation: "Oorspr. taal uitgave", raw: "eng" }) }
        : {}),
    },

    subjects: {
      "topical-subject": oneOrMany(subjects),
    },

    genres: {
      genre: oneOrMany(genres),
    },

    description: {
      pages: textNode(extractPages(title.annotationCollation), { translation: "Pagina's" }),
      "physical-description": textNode(text(title.annotationCollation), { translation: "Kenmerken" }),
    },

    summaries: {
      summary: textNode(first(title.contents, title.acquisitionInformation, summary?.items?.[0]?.contents), {
        translation: "Samenvatting",
      }),
    },

    notes: {
      note: oneOrMany(notes),
    },

    "target-audiences": {
      "target-audience": textNode(targetAudienceText(title), {
        translation: "Doelgroep",
        "search-method": "targetaudience",
        "search-term": targetAudienceSearchTerm(title),
        "search-type": "searcher",
        raw: targetAudienceSearchTerm(title),
      }),
    },

    series: {
      "series-title": oneOrMany(series),
    },

    ratings: {},

    "librarian-info": {
      _attributes: { translation: "Informatie voor bibliothecarissen" },
      info: attrOnlyNode({
        "import-time": "",
        material: text(title.material),
        language: languageCode(language),
        languageo: title.titleTranslationOf ? "eng" : "",
        debug: "source=oclc-wise",
      }),
      record: {
        marc: buildMarc(title, { titleText, mainAuthorName, isbn, ppn, language }),
        meta: {
          branches: branchMeta,
        },
        "undup-info": buildUndupInfo({ detailId, frabl, title: titleText, author: mainAuthorName, count: asArray(title.childTitleIds).length || "" }),
      },
    },

    "undup-info": buildUndupInfo({
      detailId,
      frabl,
      title: titleText,
      author: mainAuthorName,
      count: asArray(title.childTitleIds).length || "",
      formatItems: buildUndupFormatItems(title, detailId, frabl),
    }),

    custom: {},

    branches: topLevelBranches,

    services: {},
  };

  return mapped;
}

function buildEmptyDetailWrapper() {
  return {
    _attributes: { version: "1", "detail-level": "Librarian", source: "oclc-wise" },
    meta: { rctx: textNode(buildRctx()) },
    id: textNode("", { nativeid: "", ds: "library/v/OBA", translation: "ID", "search-method": "id", "search-term": "", "search-type": "precise" }),
    frabl: textNode("", { translation: "FRBR Nummer (FRABL)", "search-method": "frabl", "search-term": "", "search-type": "searcher" }),
    "detail-page": textNode(""),
    coverimages: { coverimage: textNode("", { translation: "Cover" }) },
    titles: { title: textNode("", { translation: "Titel", "search-method": "title", "search-term": "", "search-type": "fuzzy" }), "short-title": textNode("", { translation: "Korte titel" }) },
    authors: { "main-author": textNode("", { translation: "Auteur (hoofd)", main: "true" }) },
    formats: { format: textNode("", { translation: "Formaat", raw: "" }) },
    identifiers: { "isbn-id": textNode("", { translation: "ISBN" }), "normalized-isbn-id": textNode("", { translation: "ISBN (genormaliseerd)" }), "ppn-id": textNode("", { translation: "PICA productienummer" }) },
    publication: { year: textNode("", { translation: "Publicatiejaar" }), publishers: { publisher: textNode("", { translation: "Uitgever" }) }, editions: { edition: textNode("", { translation: "Editie" }) } },
    languages: { language: textNode("", { translation: "Taal", raw: "" }) },
    subjects: { "topical-subject": [] },
    genres: { genre: [] },
    description: { pages: textNode("", { translation: "Pagina's" }), "physical-description": textNode("", { translation: "Kenmerken" }) },
    summaries: { summary: textNode("", { translation: "Samenvatting" }) },
    notes: { note: [] },
    "target-audiences": { "target-audience": textNode("", { translation: "Doelgroep", raw: "" }) },
    series: { "series-title": [] },
    ratings: {},
    "librarian-info": { _attributes: { translation: "Informatie voor bibliothecarissen" }, record: { meta: { branches: [] } } },
    "undup-info": buildUndupInfo({ detailId: "", frabl: "", title: "", author: "" }),
    custom: {},
    branches: [{ branch: [] }, { branch: [] }],
    services: {},
  };
}

function buildContributorNode(contributor = {}) {
  const name = text(contributor.description);
  return textNode(splitName(name).display || name, {
    "search-method": "author",
    "search-term": splitName(name).display || name,
    "search-type": "searcher",
    translation: "Auteur",
    type: text(contributor.addition),
    "localized-type": text(contributor.type),
    creatortype: contributor.thesaurusNumber ? "person" : "unknown",
  });
}

function extractPlace(imprint = "") {
  return text(imprint.split(":")[0]);
}

function extractPublisher(imprint = "") {
  const rest = imprint.split(":")[1] || imprint;
  return text(rest.split(",")[0]);
}

function extractPages(annotationCollation = "") {
  return text(annotationCollation.split(";")[0]);
}

function buildSubjects(title = {}) {
  return [...asArray(title.subjects), ...asArray(title.subjectSchoolWise), ...asArray(title.subjectThemeForm)]
    .map((subject) => text(subject?.description || subject?._text || subject))
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

function buildGenres(title = {}) {
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

function buildSeries(title = {}) {
  return [...asArray(title.titleSeries), ...asArray(title.titleSeriesSchoolWise)]
    .map((series) => text(series?.description || series?._text || series))
    .filter(Boolean)
    .map((value) =>
      textNode(value, {
        translation: "In de reeks",
        "search-method": "series",
        "search-term": value,
        "search-type": "searcher",
      })
    );
}

function buildNotes(title = {}) {
  return [title.annotationNoMarc, title.imprintExtended, title.internalNote]
    .map((note) => text(note).replace(/\n/g, " "))
    .filter(Boolean)
    .map((value) => textNode(value, { translation: "Aantekening" }));
}

function buildEResources(title = {}) {
  const links = asArray(title.externalLinks)
    .map((link) => attrOnlyNode({ type: text(link.type || link.description), url: text(link.url), translation: "Website" }))
    .filter((link) => text(link._attributes.url));
  return links.length ? { eresource: oneOrMany(links) } : {};
}

function targetAudienceText(title = {}) {
  if (title.youth) return "Jeugd";
  if (title.adult) return "Volwassenen";
  return text(title.targetGroup);
}

function targetAudienceSearchTerm(title = {}) {
  if (title.youth) return "ageYouth";
  if (title.adult) return "ageAdults";
  return text(title.targetGroup);
}

function buildMarc(title = {}, context = {}) {
  const authorParts = splitName(context.mainAuthorName);
  return {
    _attributes: { src: "v" },
    df010: { df010: textNode(context.isbn, { key: "a" }) },
    df020: { df020: textNode(context.ppn, { key: "b" }) },
    df101: { df101: textNode(`${languageCode(asArray(title.language)[0] || {})} [${languageDescription(asArray(title.language)[0] || {})}]`, { key: "a" }) },
    df200: {
      df200: [
        textNode(context.titleText, { key: "a" }),
        textNode(text(title.media?.description), { key: "b" }),
        textNode(authorParts.display || context.mainAuthorName, { key: "f" }),
      ],
    },
    df210: {
      df210: [textNode(extractPlace(title.imprint), { key: "a" }), textNode(extractPublisher(title.imprint), { key: "c" }), textNode(text(title.publicationYear), { key: "d" })],
    },
    df215: { df215: textNode(text(title.annotationCollation), { key: "a" }) },
    df320: { df320: textNode(text(title.contents), { key: "a" }) },
    df700: {
      df700: [textNode(authorParts.last, { key: "a" }), textNode(authorParts.first, { key: "b" }), textNode(authorParts.display || context.mainAuthorName, { key: "ab" })],
    },
  };
}

function buildMarcBranches(items = []) {
  return asArray(items).map((item) => ({
    branches: [
      textNode(buildBranchPValue(item), { key: "p" }),
      textNode(text(item.barcode), { key: "b" }),
      textNode(text(item.subLocation || item.shelfDescription), { key: "s" }),
      textNode(text(item.callNumber || item.headWord), { key: "m" }),
      textNode(text(item.shelfCode), { key: "k" }),
      textNode(text(item.branchId), { key: "a" }),
      textNode(text(item.itemCreationDate).replace(/-/g, ""), { key: "rss" }),
    ],
  }));
}

function buildBranchPValue(item = {}) {
  return [
    text(item.barcode),
    text(item.branchId),
    text(item.location),
    text(item.subLocation || item.shelfDescription),
    text(item.callNumber || item.headWord),
    text(item.shelfCode),
    text(item.returnDate),
    "-",
    "-",
    "-",
    text(item.shelfDescription),
  ].join("^");
}

function buildTopLevelBranches(items = []) {
  const selected = asArray(items).filter((item) => ALLOWED_BRANCHES.includes(String(item.branchId)) || !ALLOWED_BRANCHES.length);
  const compact = selected.map((item) =>
    attrOnlyNode({
      id: `/root/OBA/${text(item.branchName)}`,
      translation: text(item.branchName),
    })
  );

  const expanded = selected.map((item) => ({
    _attributes: {
      translation: text(item.branchName),
      id: `/root/OBA/${text(item.branchName)}`,
    },
    holding: {
      _attributes: {
        id: `/root/OBA/${text(item.branchName)}`,
        name: text(item.branchName),
        parent: "/root/OBA",
        profiles: "oba",
        latitude: "",
        longitude: "",
        impala: "",
        bios: "",
        url: "",
      },
      address: {
        city: textNode(""),
      },
      availability: {
        status: textNode(text(item.effectiveStatus)),
        "status-code": textNode(text(item.effectiveStatusCode)),
        location: textNode(text(item.subLocation || item.shelfDescription)),
        signature: textNode(text(item.callNumber || item.headWord)),
      },
    },
  }));

  return [{ branch: compact }, { branch: expanded }];
}

function buildUndupFormatItems(title = {}, detailId, frabl) {
  return [
    {
      _attributes: {
        text: text(title.media?.description),
        icon: "",
        translation: "Formaat",
        "undup-all-search": text(frabl) ? `frabl=0x${text(frabl)}MFFF` : "",
        "format-raw": formatRawFromMedia(title.media || {}),
      },
      item: attrOnlyNode({
        extid: `|oba-catalogus|${detailId}`,
        frabl: text(frabl),
        language: languageDescription(asArray(title.language)[0] || {}),
        "language-raw": languageCode(asArray(title.language)[0] || {}),
        year: text(title.publicationYear),
        publisher: extractPublisher(title.imprint),
        globalholdingscount: "",
      }),
    },
  ];
}
