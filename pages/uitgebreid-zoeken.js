import { useState } from "react";
import Link from "next/link";

const GENRES = [
  ["", ""],
  ["DI", "Dieren"],
  ["DE", "Detective"],
  ["GR", "Griezelverhaal"],
  ["AV", "Avontuur"],
];

const FORMATS = [
  ["", ""],
  ["BOE", "Boek"],
  ["DVD", "DVD"],
  ["STR", "Strip"],
];

const LANGUAGES = [
  ["", ""],
  ["DUT", "Nederlands"],
  ["ENG", "Engels"],
  ["GER", "Duits"],
];

const emptyForm = {
  q: "",
  title: "",
  author: "",
  subject: "",
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

export default function AdvancedSearchPage() {
  const [form, setForm] = useState(emptyForm);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

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
        if (value) params.set(key, "true");
        return;
      }

      if (text(value)) {
        params.set(key, value);
      }
    });

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

      <div className="container advanced-search-page">
        <div className="advanced-hero">
          <h1>Uitgebreid zoeken</h1>
        </div>

        <div className="advanced-tabs">
          <button className="advanced-tab active" type="button">
            Catalogus
          </button>

          <button className="advanced-tab disabled" type="button" disabled>
            Activiteiten
          </button>

          <button className="advanced-tab disabled" type="button" disabled>
            Alles
          </button>

          <button className="advanced-tab disabled" type="button" disabled>
            Uittreksels
          </button>
        </div>

        <form className="advanced-card" onSubmit={submit}>
          <div className="advanced-top-search">
            <div className="old-school-combined-search">
              <div className="old-school-search-input-wrap">
                <span className="old-school-search-icon">⌕</span>

                <input
                  className="old-school-search-input"
                  value={form.q}
                  onChange={(event) => setField("q", event.target.value)}
                  placeholder="Zoek in de catalogus"
                />
              </div>
            </div>

            <button type="submit" className="old-school-submit">
              →
            </button>
          </div>

          <div className="advanced-filter-list">
            <label>
              <span className="advanced-filter-title">Titel</span>

              <input
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
              />
            </label>

            <label>
              <span className="advanced-filter-title">Auteur</span>

              <input
                value={form.author}
                onChange={(event) => setField("author", event.target.value)}
              />
            </label>

            <label>
              <span className="advanced-filter-title">Onderwerp</span>

              <input
                value={form.subject}
                onChange={(event) => setField("subject", event.target.value)}
              />
            </label>

            <label>
              <span className="advanced-filter-title">Reeks</span>

              <input
                value={form.series}
                onChange={(event) => setField("series", event.target.value)}
              />
            </label>

            <label>
              <span className="advanced-filter-title">ISBN</span>

              <input
                value={form.isbn}
                onChange={(event) => setField("isbn", event.target.value)}
              />
            </label>

            <label>
              <span className="advanced-filter-title">Jaar</span>

              <input
                value={form.year}
                onChange={(event) =>
                  setField(
                    "year",
                    event.target.value.replace(/[^\d]/g, "").slice(0, 4)
                  )
                }
              />
            </label>

            <label>
              <span className="advanced-filter-title">Genre</span>

              <select
                value={form.genreCode}
                onChange={(event) => setField("genreCode", event.target.value)}
              >
                {GENRES.map(([value, label]) => (
                  <option key={value || "empty"} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="advanced-filter-title">Formaat</span>

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

            <label>
              <span className="advanced-filter-title">Taal</span>

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

            <label className="advanced-check">
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
