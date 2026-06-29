const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const text = (v) => (typeof v === "string" ? v.trim() : v || "");

const ALLOWED_BRANCHES = ["1000", "1001", "1002", "1003", "1004"];

export function mapWiseToObaFull({ title, availability, summary, itemInformation }) {
  if (!title || typeof title !== "object") return {};

  const author = title.author || {};
  const collaborators = asArray(title.collaborators);

  const [mainLast = "", mainFirstRaw = ""] = (author.description || "").split(",");
  const mainFirst = mainFirstRaw.trim();

  const secondaryLast = collaborators
    .map((c) => c.description?.split(",")[0])
    .filter(Boolean)
    .join(", ");

  const secondaryFirst = collaborators
    .map((c) => c.description?.split(",").slice(1).join(",").trim())
    .filter(Boolean)
    .join(", ");

  const secondaryRoles = collaborators.map((c) => c.addition).filter(Boolean).join(", ");

  return {
    titles: {
      title: { _text: text(title.title) }
    },

    authors: {
      "main-author": { _text: text(author.description) }
    },

    identifiers: {
      "isbn-id": { _text: text(asArray(title.isbn)[0]) },
      "ppn-id": { _text: text(asArray(title.ppn)[0]) }
    },

    publication: {
      year: { _text: title.publicationYear ? `[${title.publicationYear}]` : "" },
      place: { _text: extractPlace(title.imprint) },
      publishers: {
        publisher: { _text: extractPublisher(title.imprint) }
      }
    },

    languages: {
      language: {
        _text: title.language?.[0]
          ? `${title.language[0].code?.toLowerCase()} [${title.language[0].description}]`
          : ""
      },
      "original-language": {
        _text: "eng [Engels]"
      }
    },

    formats: {
      format: [{ _text: text(title.media?.description) }]
    },

    description: {
      pages: { _text: extractPagesFull(title.annotationCollation) },
      "physical-description": { _text: extractIllustrations(title.annotationCollation) },
      size: { _text: extractSize(title.annotationCollation) }
    },

    series: {
      title: { _text: text(title.titleSeries?.[0]?.description) }
    },

    classification: {
      siso: { _text: formatSiso(title.classification?.[0]?.description) }
    },

    subjects: {
      "topical-subject": asArray(title.subjects)
        .map((s) => ({ _text: text(s.description) }))
        .filter((s) => s._text)
    },

    annotation: {
      _text: cleanAnnotation(title.annotationNoMarc)
    },

    contributors: {
      primary: {
        role: text(author.addition),
        lastName: text(mainLast),
        firstName: text(mainFirst)
      },
      secondary: {
        roles: text(secondaryRoles),
        lastName: text(secondaryLast),
        firstName: text(secondaryFirst)
      }
    },

    misc: {
      bookcode: buildBookcode(title),
      material: `${text(title.titleCategory)} [${text(title.media?.description)}]`.trim(),
      nbd: extractNBD(title.libraryRecommendation),
      prodCountry: "ne"
    },

    summaries: {
      summary: { _text: text(title.contents) }
    },

    coverimages: {
      coverimage: { _text: text(title.imageUrls?.large) }
    },

    "librarian-info": {
      record: {
        meta: {
          branches: buildBranches(itemInformation)
        }
      }
    }
  };
}

// ===== Helpers =====

function extractPlace(imprint = "") {
  return text(imprint.split(":")[0]);
}

function extractPublisher(imprint = "") {
  const rest = imprint.split(":")[1] || "";
  return text(rest.split(",")[0]);
}

function extractPagesFull(str = "") {
  return text(str.split(":")[0]);
}

function extractIllustrations(str = "") {
  return text(str.split(":")[1]?.split(";")[0]);
}

function extractSize(str = "") {
  return text(str.split(";")[1]);
}

function formatSiso(code) {
  return code ? `J${code}` : "";
}

function cleanAnnotation(str = "") {
  return text(str.replace(/\n/g, " "));
}

function extractNBD(str = "") {
  return str.match(/\b\d{10}\b/)?.[0] || "";
}

function buildBookcode(title) {
  const siso = formatSiso(title.classification?.[0]?.description);
  const name = title.author?.description?.split(",")[0]?.toLowerCase();
  return siso && name ? `AJ.${siso}-${name}` : "";
}

function buildBranches(items = []) {
  return asArray(items)
    .filter((item) => ALLOWED_BRANCHES.includes(String(item.branchId)))
    .map((item) => ({
      branches: [
        { _attributes: { key: "b" }, _text: text(item.barcode) },
        { _attributes: { key: "s" }, _text: text(item.branchName) },
        { _attributes: { key: "m" }, _text: text(item.shelfDescription || item.subLocation) },
        { _attributes: { key: "k" }, _text: text(item.callNumber) },
        { _attributes: { key: "status" }, _text: mapStatus(item.effectiveStatus) }
      ]
    }));
}

function mapStatus(status) {
  switch (status) {
    case "AVAILABLE": return "Aanwezig";
    case "ON_LOAN": return "Uitgeleend";
    case "MISSING": return "Niet beschikbaar";
    default: return text(status) || "Onbekend";
  }
}
