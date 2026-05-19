import Link from "next/link";
import { useState } from "react";

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const GENRES = [
  ["", "Geen voorkeur"],
  ["DI", "Dieren"],
  ["GR", "Griezelverhaal"],
  ["DE", "Detective"],
  ["AV", "Spanning en avontuur"],
  ["SK", "Sprookjes"],
  ["VH", "Verhalen"],
  ["HU", "Humor"],
  ["ST", "Stripverhaal"],
];

const FORMATS = [
  ["", "Geen voorkeur"],
  ["BOE", "Boek"],
  ["STR", "Strip"],
  ["DVD", "DVD-video"],
  ["BLR", "Blu-ray"],
  ["MLB", "Meeluisterboek"],
  ["LUI", "Luisterboek"],
  ["SPG", "Speelgoed"],
];

const LANGUAGES = [
  ["", "Geen voorkeur"],
  ["DUT", "Nederlands"],
  ["ENG", "Engels"],
  ["GER", "Duits"],
  ["FRE", "Frans"],
  ["ARA", "Arabisch"],
  ["TUR", "Turks"],
];

const BRANCHES = [
  ["", "Alle vestigingen"],
  ["1000", "A'veen Stadsplein"],
  ["1001", "A'veen Westwijk"],
  ["1002", "Aalsmeer"],
  ["1003", "Uithoorn"],
  ["1004", "Kudelstaart"],
];

const AUDIENCES = [
  ["", "Geen voorkeur"],
  ["JN", "Jeugd"],
  ["NJ", "Volwassen"],
];

const TARGET_AUDIENCES = [
  ["", "Geen voorkeur"],
  ["AB", "BoekStart"],
  ["AP", "Peuters"],
  ["AK", "Kleuters"],
  ["A", "6-9 jaar"],
  ["B", "9-12 jaar"],
  ["C", "13 jaar en ouder"],
  ["D", "Young adult"],
  ["E", "Eerste leesboekjes"],
];

const SORTS = [
  ["", "Relevantie"],
  ["2911 DESC", "Populariteit"],
  ["2912 DESC", "Jaar aflopend"],
  ["2912 ASC", "Jaar oplopend"],
  ["2913 ASC", "Auteur"],
  ["2914 ASC", "Titel"],
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
  branchId: "",
  audienceCode: "",
  targetAudienceCode: "",
  available: false,
  sort: "",
};

function resultId(item = {}) {
  return text(item.id).replace(/^GBS:T:/, "");
}

function metadata(item = {}) {
  return item.metadata || {};
}

export default function AdvancedSearchPage() {
  const [form, setForm] = useState(emptyForm);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const response = data?.response || {};
  const results = asArray(response.items);
  const total = response.total ?? 0;
  const calls = asArray(data?.debug?.calls);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function buildParams(nextPage = 1) {
    const params = new URLSearchParams();

    Object.entries(form).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        if (value) params.set(key, "true");
        return;
      }

      if (text(value)) params.set(key, text(value));
    });

    params.set("page", String(nextPage));
    params.set("limit", "20");

    return params;
  }

  async function search(nextPage = 1) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/advanced-search?${buildParams(nextPage).toString()}`);
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(json?.response?.message || json?.error || `Request failed ${response.status}`);
      }

      setData(json);
    } catch (err) {
      setError(err.message || "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    search(1);
  }

  function reset() {
    setForm(emptyForm);
    setData(null);
    setError("");
  }

  return (
    <div className="page">
      <div className="header-image">
        <img src="/header.JPG" alt="Header" />
      </div>

      <div className="container advanced-search-page">
        <div className="advanced-hero">
          <div>
            <p className="advanced-kicker">Catalogus</p>
            <h1>Uitgebreid zoeken</h1>
            <p>
              Zoek met vrije invoer of bouw een zoekopdracht met velden en filters. Vrije invoer is
              niet verplicht.
            </p>
          </div>
        </div>

        <div className="advanced-tabs">
          <button className="advanced-tab active" type="button">Catalogus</button>
          <button className="advanced-tab disabled" type="button" disabled>Activiteiten</button>
          <button className="advanced-tab disabled" type="button" disabled>Alles</button>
          <button className="advanced-tab disabled" type="button" disabled>Uittreksels</button>
        </div>

        <form className="advanced-card" onSubmit={submit}>
          <div className="advanced-grid">
            <label>
              <span>Vrije invoer</span>
              <input
                value={form.q}
                onChange={(event) => setField("q", event.target.value)}
                placeholder="Bijvoorbeeld kikker"
              />
            </label>

            <label>
              <span>Titel</span>
              <input
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                placeholder="Bijvoorbeeld reis door de nacht"
              />
            </label>

            <label>
              <span>Auteur</span>
              <input
                value={form.author}
                onChange={(event) => setField("author", event.target.value)}
                placeholder="Bijvoorbeeld Paul van Loon"
              />
            </label>

            <label>
              <span>Onderwerp</span>
              <input
                value={form.subject}
                onChange={(event) => setField("subject", event.target.value)}
                placeholder="Bijvoorbeeld dieren"
              />
            </label>

            <label>
              <span>Reeks</span>
              <input
                value={form.series}
                onChange={(event) => setField("series", event.target.value)}
                placeholder="Bijvoorbeeld Dolfje Weerwolfje"
              />
            </label>

            <label>
              <span>ISBN</span>
              <input
                value={form.isbn}
                onChange={(event) => setField("isbn", event.target.value)}
                placeholder="978..."
              />
            </label>

            <label>
              <span>Jaar</span>
              <input
                value={form.year}
                onChange={(event) => setField("year", event.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                placeholder="1952"
                inputMode="numeric"
              />
            </label>

            <label>
              <span>Genre</span>
              <select value={form.genreCode} onChange={(event) => setField("genreCode", event.target.value)}>
                {GENRES.map(([value, label]) => (
                  <option key={value || "empty"} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Formaat</span>
              <select value={form.mediumTypeCode} onChange={(event) => setField("mediumTypeCode", event.target.value)}>
                {FORMATS.map(([value, label]) => (
                  <option key={value || "empty"} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Taal</span>
              <select value={form.languageCode} onChange={(event) => setField("languageCode", event.target.value)}>
                {LANGUAGES.map(([value, label]) => (
                  <option key={value || "empty"} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Bibliotheek</span>
              <select value={form.branchId} onChange={(event) => setField("branchId", event.target.value)}>
                {BRANCHES.map(([value, label]) => (
                  <option key={value || "empty"} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Doelgroep</span>
              <select value={form.audienceCode} onChange={(event) => setField("audienceCode", event.target.value)}>
                {AUDIENCES.map(([value, label]) => (
                  <option key={value || "empty"} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Leeftijd</span>
              <select value={form.targetAudienceCode} onChange={(event) => setField("targetAudienceCode", event.target.value)}>
                {TARGET_AUDIENCES.map(([value, label]) => (
                  <option key={value || "empty"} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Sortering</span>
              <select value={form.sort} onChange={(event) => setField("sort", event.target.value)}>
                {SORTS.map(([value, label]) => (
                  <option key={value || "empty"} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="advanced-check">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(event) => setField("available", event.target.checked)}
            />
            <span>Alleen beschikbare titels</span>
          </label>

          <div className="advanced-actions">
            <button type="submit" className="advanced-submit" disabled={loading}>
              Zoek
            </button>
            <button type="button" className="advanced-secondary" onClick={reset}>
              Wis
            </button>
          </div>
        </form>

        {error ? <div className="search-error">Fout: {error}</div> : null}
        {loading ? <div className="search-loading">Zoeken...</div> : null}

        {data ? (
          <section className="advanced-results">
            <div className="advanced-results-head">
              <h2>{total} resultaten</h2>
            </div>

            {results.length ? (
              results.map((item) => {
                const meta = metadata(item);
                const id = resultId(item);
                const title = text(meta.title);
                const author = asArray(meta.author).map(text).filter(Boolean).join(", ");
                const year = text(meta.publicationYear);
                const medium = asArray(meta.mediumTypeLabel).map(text).filter(Boolean).join(", ");
                const genre = asArray(meta.genreLabel).map(text).filter(Boolean).join(", ");
                const description = text(meta.description);

                return (
                  <article className="advanced-result" key={id || item.id}>
                    <div>
                      <Link href={id ? `/item/${encodeURIComponent(id)}` : "#"} className="advanced-result-title">
                        {title || "Onbekende titel"}
                      </Link>
                      <div className="advanced-meta">
                        {[author, year, medium, genre].filter(Boolean).join(" | ")}
                      </div>
                      {description ? <p>{description}</p> : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="info-card">Geen resultaten.</div>
            )}

            <div className="pagination-row">
              <button type="button" className="tab-button" onClick={() => search(1)}>
                eerste pagina
              </button>
              <button type="button" className="tab-button active" onClick={() => search(Math.floor((response.offset || 0) / (response.limit || 20)) + 2)}>
                volgende
              </button>
            </div>
          </section>
        ) : null}

        <section className="debug-section">
          <details className="debug-block">
            <summary>OCLC API calls</summary>
            <div className="debug-content">
              {calls.length ? (
                calls.map((call, index) => (
                  <details className="debug-call" key={`${call?.url || "call"}-${index}`}>
                    <summary>{call?.url || "Onbekende call"} | {call?.status || "?"}</summary>
                    <pre>{JSON.stringify(call?.body ?? call, null, 2)}</pre>
                  </details>
                ))
              ) : (
                <pre>Geen calls beschikbaar</pre>
              )}
            </div>
          </details>

          <details className="debug-block">
            <summary>Raw OCLC response</summary>
            <div className="debug-content">
              <pre>{JSON.stringify(response, null, 2)}</pre>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
