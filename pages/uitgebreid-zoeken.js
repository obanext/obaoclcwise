import { useMemo, useState } from "react";
import Link from "next/link";

const GENRES = [
  ["", "Kies een waarde"],
  ["DI", "Dieren"],
  ["DE", "Detective"],
  ["GR", "Griezelverhaal"],
  ["AV", "Avontuur"],
];

const FORMATS = [
  ["", "Kies een waarde"],
  ["BOE", "Boek"],
  ["DVD", "DVD"],
  ["STR", "Strip"],
];

const LANGUAGES = [
  ["", "Kies een waarde"],
  ["DUT", "Nederlands"],
  ["ENG", "Engels"],
  ["GER", "Duits"],
];

const emptyForm = {
  q: "",
  title: "",
  author: "",
  subject: "",
  publisher: "",
  series: "",
  isbn: "",
  year: "",
  genreCode: "",
  mediumTypeCode: "",
  languageCode: "",
  available: false,
};

function text(value) {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function buildQuery(form) {
  const parts = [];

  if (text(form.q)) {
    parts.push(form.q.trim());
  }

  if (text(form.title)) {
    parts.push(`title:"${form.title.trim()}"`);
  }

  if (text(form.author)) {
    parts.push(`author:"${form.author.trim()}"`);
  }

  if (text(form.subject)) {
    parts.push(`subject:"${form.subject.trim()}"`);
  }

  if (text(form.publisher)) {
    parts.push(`publisher:"${form.publisher.trim()}"`);
  }

  if (text(form.series)) {
    parts.push(`series:"${form.series.trim()}"`);
  }

  if (text(form.isbn)) {
    parts.push(`isbn:"${form.isbn.trim()}"`);
  }

  if (text(form.year)) {
    parts.push(`year:"${form.year.trim()}"`);
  }

  return parts.join(" ");
}

export default function AdvancedSearchPage() {
  const [form, setForm] = useState(emptyForm);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const queryPreview = useMemo(() => buildQuery(form), [form]);

  const results = asArray(data?.response?.items);
  const total = data?.response?.total || 0;

  function setField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setLoading(true);

    const params = new URLSearchParams();

    Object.entries(form).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        if (value) {
          params.set(key, "true");
        }
        return;
      }

      if (text(value)) {
        params.set(key, value);
      }
    });

    params.set("queryPreview", queryPreview);

    const response = await fetch(`/api/advanced-search?${params.toString()}`);

    const json = await response.json();

    setData(json);
    setLoading(false);
  }

  function resultId(item = {}) {
    return text(item.id).replace(/^GBS:T:/, "");
  }

  return (
    <main>
      <div className="header-image">
        <img src="/header.JPG" alt="OBA" />
      </div>

      <div className="container advanced-search-old-page">
        <div className="advanced-old-topbar">
          <div className="old-school-combined-search">
            <select className="old-school-select">
              <option>OBA</option>
            </select>

            <div className="old-school-search-input-wrap">
              <input
                className="old-school-search-input"
                value={form.q}
                onChange={(event) => setField("q", event.target.value)}
                placeholder="Voer hier uw zoekterm(en) in"
              />
            </div>
          </div>

          <button className="advanced-old-find-button">VIND</button>

          <span className="advanced-old-link">uitgebreid zoeken</span>
        </div>

        <button className="advanced-old-back">Terug</button>

        <form className="advanced-old-layout" onSubmit={submit}>
          <aside className="advanced-old-sidebar">
            <div className="advanced-old-sidebar-title">Zoek in:</div>

            <button type="button" className="advanced-old-nav disabled">
              Activiteiten
            </button>

            <button type="button" className="advanced-old-nav disabled">
              Alles
            </button>

            <button type="button" className="advanced-old-nav active">
              Catalogus
            </button>

            <button type="button" className="advanced-old-nav disabled">
              Uittreksels
            </button>
          </aside>

          <section className="advanced-old-main">
            <div className="advanced-old-query-row">
              <div className="advanced-old-label">
                Uw zoekopdracht
              </div>

              <textarea
                value={queryPreview}
                readOnly
                className="advanced-old-query-preview"
              />
            </div>

            <div className="advanced-old-fields">
              <label className="advanced-old-field">
                <span>Titel</span>

                <input
                  value={form.title}
                  onChange={(event) =>
                    setField("title", event.target.value)
                  }
                />

                <small>De titel, of een gedeelte van de titel</small>
              </label>

              <label className="advanced-old-field">
                <span>Auteur</span>

                <input
                  value={form.author}
                  onChange={(event) =>
                    setField("author", event.target.value)
                  }
                />

                <small>Auteur, acteur, regisseur, artiest</small>
              </label>

              <label className="advanced-old-field">
                <span>Formaat</span>

                <select
                  value={form.mediumTypeCode}
                  onChange={(event) =>
                    setField("mediumTypeCode", event.target.value)
                  }
                >
                  {FORMATS.map(([value, label]) => (
                    <option key={value || "empty"} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="advanced-old-field">
                <span>Jaar</span>

                <input
                  value={form.year}
                  onChange={(event) =>
                    setField(
                      "year",
                      event.target.value
                        .replace(/[^\d]/g, "")
                        .slice(0, 4)
                    )
                  }
                />

                <small>Zoek in het formaat: JJJJ</small>
              </label>

              <label className="advanced-old-field">
                <span>Genre</span>

                <select
                  value={form.genreCode}
                  onChange={(event) =>
                    setField("genreCode", event.target.value)
                  }
                >
                  {GENRES.map(([value, label]) => (
                    <option key={value || "empty"} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="advanced-old-field">
                <span>Taal</span>

                <select
                  value={form.languageCode}
                  onChange={(event) =>
                    setField("languageCode", event.target.value)
                  }
                >
                  {LANGUAGES.map(([value, label]) => (
                    <option key={value || "empty"} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="advanced-old-field">
                <span>Onderwerp</span>

                <input
                  value={form.subject}
                  onChange={(event) =>
                    setField("subject", event.target.value)
                  }
                />
              </label>

              <label className="advanced-old-field">
                <span>Uitgever</span>

                <input
                  value={form.publisher}
                  onChange={(event) =>
                    setField("publisher", event.target.value)
                  }
                />
              </label>

              <label className="advanced-old-field">
                <span>ISBN</span>

                <input
                  value={form.isbn}
                  onChange={(event) =>
                    setField("isbn", event.target.value)
                  }
                />
              </label>

              <label className="advanced-old-field">
                <span>Reeks</span>

                <input
                  value={form.series}
                  onChange={(event) =>
                    setField("series", event.target.value)
                  }
                />
              </label>

              <label className="advanced-old-checkbox">
                <input
                  type="checkbox"
                  checked={form.available}
                  onChange={(event) =>
                    setField("available", event.target.checked)
                  }
                />

                <span>Alleen beschikbare titels</span>
              </label>
            </div>

            <div className="advanced-old-actions">
              <button type="submit" className="advanced-old-submit">
                VIND
              </button>
            </div>
          </section>
        </form>

        {loading ? (
          <div className="search-loading">Zoeken...</div>
        ) : null}

        {data ? (
          <section className="advanced-results">
            <div className="advanced-results-head">
              <h2>{total} resultaten</h2>
            </div>

            <div className="oba-result-list">
              {results.map((item) => {
                const metadata = item.metadata || {};
                const id = resultId(item);

                return (
                  <article className="oba-result-item" key={item.id}>
                    <div>
                      <Link
                        href={`/oba-detail/${id}`}
                        className="oba-result-title"
                      >
                        {metadata.title || "Onbekende titel"}
                      </Link>

                      <div className="oba-result-author">
                        {asArray(metadata.author).join(", ")}
                      </div>

                      <div className="oba-result-meta">
                        {[
                          metadata.publicationYear,
                          asArray(metadata.mediumTypeLabel).join(", "),
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      </div>

                      {metadata.description ? (
                        <p className="oba-result-summary">
                          {metadata.description}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
