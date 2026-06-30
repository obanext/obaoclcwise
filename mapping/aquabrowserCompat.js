export const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

export const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

export const first = (...values) => values.find((value) => text(value)) || "";

export const textNode = (value = "", attributes = undefined) => {
  const node = {};
  if (attributes && Object.keys(attributes).length) node._attributes = attributes;
  node._text = text(value);
  return node;
};

export const attrOnlyNode = (attributes = {}) => ({ _attributes: attributes });

export const oneOrMany = (items) => {
  const list = asArray(items).filter(Boolean);
  if (list.length === 0) return [];
  if (list.length === 1) return list[0];
  return list;
};

export function isNumericId(value) {
  return /^\d+$/.test(text(value));
}

export function splitName(value = "") {
  const source = text(value);
  if (!source) return { first: "", last: "", display: "" };

  if (source.includes(",")) {
    const [last = "", ...rest] = source.split(",");
    const firstName = text(rest.join(", "));
    const lastName = text(last);
    return {
      first: firstName,
      last: lastName,
      display: text([firstName, lastName].filter(Boolean).join(" ")) || source,
    };
  }

  const parts = source.split(/\s+/).filter(Boolean);
  return {
    first: text(parts.slice(0, -1).join(" ")),
    last: text(parts.slice(-1).join(" ")),
    display: source,
  };
}

export function formatRawFromMedia(media = {}) {
  const icon = text(media.icon).toLowerCase();
  const code = text(media.code).toLowerCase();
  const description = text(media.description).toLowerCase();

  if (icon.includes("book") || code === "boe" || description.includes("boek")) return "book";
  if (icon.includes("audio") || description.includes("luister")) return "audiobook";
  if (icon.includes("dvd") || description.includes("dvd")) return "dvdvideo";
  if (icon.includes("image") || description.includes("vertelplaten")) return "image";
  return first(icon, code, description);
}

export function languageCode(language = {}) {
  return text(language.code || language.raw || language).toLowerCase();
}

export function languageDescription(language = {}) {
  return text(language.description || language._text || language);
}

export function buildRctx(seed = "") {
  // Aquabrowser levert een opaque rctx-token. Voor compatibiliteit is aanwezigheid
  // belangrijker dan de exacte waarde. Gebruik een stabiele placeholder per request.
  return seed ? `oclc-wise:${seed}` : "oclc-wise";
}

export function buildUndupInfo({ detailId, frabl, title, author, count = "", formatItems = [] }) {
  const base = {
    _attributes: {
      key: `|oba-catalogus|${text(detailId)}`,
      cnt: text(count),
      sort: "year",
      frabl: text(frabl),
      "frabl-global-count": text(count),
      "frabl-key1": text(title).toLowerCase(),
      "frabl-key2": text(author).toLowerCase(),
      translation: "Informatie over dubbele items",
      "undup-all-search": text(frabl) ? `frabl=0x${text(frabl)}MFFFFFF` : "",
    },
  };

  if (formatItems.length) base.format = oneOrMany(formatItems);
  return base;
}

export function buildSortOptions(active = "relevance") {
  return {
    option: [
      { _attributes: { id: "relevance", ...(active === "relevance" ? { active: "true" } : {}), translation: "relevantie" } },
      { _attributes: { id: "year", ...(active === "year" ? { active: "true" } : {}), translation: "jaar" } },
      { _attributes: { id: "title", ...(active === "title" ? { active: "true" } : {}), translation: "titel" } },
      { _attributes: { id: "author", ...(active === "author" ? { active: "true" } : {}), translation: "auteur" } },
    ],
  };
}
