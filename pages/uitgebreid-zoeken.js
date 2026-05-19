import Link from "next/link";
import { useMemo, useState } from "react";

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const GENRES = [
  ["", "Kies een waarde"],
  ["DI", "Dieren"],
  ["DE", "Detective"],
  ["GR", "Griezelverhaal"],
  ["AV", "Spanning en avontuur"],
  ["SK", "Sprookjes"],
  ["VH", "Verhalen"],
  ["HU", "Humor"],
  ["ST", "Stripverhaal"],
];

const FORMATS = [
  ["", "Kies een waarde"],
  ["BOE", "Boek"],
  ["STR", "Strip"],
  ["DVD", "DVD-video"],
  ["BLR", "Blu-ray"],
  ["MLB", "Meeluisterboek"],
  ["LUI", "Luisterboek"],
  ["SPG", "Speelgoed"],
];

const LANGUAGES = [
  ["", "Kies een waarde"],
  ["DUT", "Nederlands"],
  ["ENG", "Engels"],
  ["GER", "Duits"],
  ["FRE", "Frans"],
  ["ARA", "Arabisch"],
  ["TUR", "Turks"],
];

const BRANCHES = [
  ["", "Kies een waarde"],
  ["1000", "A'veen Stadsplein"],
  ["1001", "A'veen Westwijk"],
  ["1002", "Aalsmeer"],
  ["1003", "Uithoorn"],
  ["1004", "Kudelstaart"],
];

const COLLECTIONS = [["", "Kies een waarde"]];
const YOUTH = [
  ["", "Kies een waarde"],
  ["JN", "Jeugd"],
  ["NJ", "Volwassen"],
];

const emptyForm = {
  q: "",
  title: "",
  author: "",
  mediumTypeCode: "",
  branchId: "",
  placementCode: "",
  year: "",
  genreCode: "",
  languageCode: "",
  subject: "",
  issn: "",
  publisher: "",
  isbn: "",
  series: "",
  collection: "",
  audienceCode: "",
  content: "",
  available: false,
};

function buildQuery(form) {
  const parts = [];

  if (text(form.q)) parts.push(text(form.q));
  if (text(form.title)) parts.push(`title:"${text(form.title)}"`);
  if (text(form.author)) parts.push(`author:"${text(form.author)}"`);
  if (text(form.mediumTypeCode)) parts.push(`format:"${text(form.mediumTypeCode)}"`);
  if (text(form.branchId)) parts.push(`library:"${text(form.branchId)}"`);
  if (text(form.placementCode)) parts.push(`placementCode:"${text(form.placementCode)}"`);
  if (text(form.year)) parts.push(`year:"${text(form.year)}"`);
  if (text(form.genreCode)) parts.push(`genre:"${text(form.genreCode)}"`);
  if (text(form.languageCode)) parts.push(`language:"${text(form.languageCode)}"`);
  if (text(form.subject)) parts.push(`subject:"${text(form.subject)}"`);
  if (text(form.issn)) parts.push(`issn:"${text(form.issn)}"`);
  if (text(form.publisher)) parts.push(`publisher:"${text(form.publisher)}"`);
  if (text(form.isbn)) parts.push(`isbn:"${text(form.isbn)}"`);
  if (text(form.series)) parts.push(`series:"${text(form.series)}"`);
  if (text(form.collection)) parts.push(`collection:"${text(form.collection)}"`);
  if (text(form.audienceCode)) parts.push(`youth:"${text(form.audienceCode)}"`);
  if (text(form.content)) parts.push(`content:"${text(form.content)}"`);
  if (form.available) parts.push("available:true");

  return parts.join(" ");
}

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

  const queryPreview = useMemo(() => buildQuery(form), [form]);
  const response = data?.response || {};
  const results = asArray(response.items);
  const total = response.total ?? 0;

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function buildParams() {
    const params = new URLSearchParams();

    Object.entries(form).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        if (value) params.set(key, "true");
        return;
      }

      if (text(value)) params.set(key, text(value));
    });

    params.set("queryPreview", queryPreview);
    params.set("page", "1");
    params.set("limit", "20");

    return params;
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const searchResponse = await fetch(`/api/advanced-search?${buildParams().toString()}`);
      const json = await searchResponse.json().catch(() => null);

      if (!searchResponse.ok) {
        throw new Error(json?.error || `Request failed ${searchResponse.status}`);
      }

      setData(json);
    } catch (err) {
      setError(err.message || "Onbekende fout");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(emptyForm);
    setData(null);
    setError("");
  }

  return (
    <main>
      <div className="header-image">
        <img src="/header.JPG" alt="OBA" />
      </div>

      <div className="container advanced-search-page">
        <section className="advanced-search-top">
          <form className="advanced-search-formbar" onSubmit={submit}>
            <select className="advanced-source-select" value="OBA" disabled>
              <option>OBA</option>
            </select>

            <div className="advanced-free-input-wrap">
              <input
                className="advanced-free-input"
                value={form.q}
                onChange={(event) => setField("q", event.target.value)}
                placeholder="Voer hier uw zoekterm(en) in"
              />
            </div>

            <button type="submit" className="advanced-top-submit" aria-label="Zoeken">
              ⌕
            </button>
          </form>

          <div className="advanced-search-link-row">
            <button type="button" onClick={reset}>Wis</button>
            <Link href="/old-school-search">Terug</Link>
          </div>
        </section>

        <div className="advanced-tabs">
          <button type="button" className="advanced-tab disabled" disabled>Activiteiten</button>
          <button type="button" className="advanced-tab disabled" disabled>Alles</button>
          <button type="button" className="advanced-tab active">Catalogus</button>
          <button type="button" className="advanced-tab disabled" disabled>Uittreksels</button>
        </div>

        <form className="advanced-panel" onSubmit={submit}>
          <div className="advanced-query-block">
            <label htmlFor="advanced-query-preview">Uw zoekopdracht</label>
            <textarea
              id="advanced-query-preview"
              className="advanced-query-preview"
              value={queryPreview}
              readOnly
            />
          </div>

          <div className="advanced-field-list">
            <div className="advanced-field"><label>Titel</label><input value={form.title} onChange={(event) => setField("title", event.target.value)} /></div>
            <div className="advanced-field"><label>Auteur</label><input value={form.author} onChange={(event) => setField("author", event.target.value)} /></div>
            <div className="advanced-field"><label>Formaat</label><select value={form.mediumTypeCode} onChange={(event) => setField("mediumTypeCode", event.target.value)}>{FORMATS.map(([value, label]) => <option key={value || "empty"} value={value}>{label}</option>)}</select></div>
            <div className="advanced-field"><label>Bibliotheek</label><select value={form.branchId} onChange={(event) => setField("branchId", event.target.value)}>{BRANCHES.map(([value, label]) => <option key={value || "empty"} value={value}>{label}</option>)}</select></div>
            <div className="advanced-field"><label>Plaatsingscode</label><input value={form.placementCode} onChange={(event) => setField("placementCode", event.target.value)} /></div>
            <div className="advanced-field"><label>Jaar</label><input value={form.year} onChange={(event) => setField("year", event.target.value.replace(/[^\d]/g, "").slice(0, 4))} /></div>
            <div className="advanced-field"><label>Genre</label><select value={form.genreCode} onChange={(event) => setField("genreCode", event.target.value)}>{GENRES.map(([value, label]) => <option key={value || "empty"} value={value}>{label}</option>)}</select></div>
            <div className="advanced-field"><label>Taal</label><select value={form.languageCode} onChange={(event) => setField("languageCode", event.target.value)}>{LANGUAGES.map(([value, label]) => <option key={value || "empty"} value={value}>{label}</option>)}</select></div>
            <div className="advanced-field"><label>Onderwerp</label><input value={form.subject} onChange={(event) => setField("subject", event.target.value)} /></div>
            <div className="advanced-field"><label>ISSN</label><input value={form.issn} onChange={(event) => setField("issn", event.target.value)} /></div>
            <div className="advanced-field"><label>Uitgever</label><input value={form.publisher} onChange={(event) => setField("publisher", event.target.value)} /></div>
            <div className="advanced-field"><label>ISBN</label><input value={form.isbn} onChange={(event) => setField("isbn", event.target.value)} /></div>
            <div className="advanced-field"><label>Reeks</label><input value={form.series} onChange={(event) => setField("series", event.target.value)} /></div>
            <div className="advanced-field"><label>Collectie</label><select value={form.collection} onChange={(event) => setField("collection", event.target.value)}>{COLLECTIONS.map(([value, label]) => <option key={value || "empty"} value={value}>{label}</option>)}</select></div>
            <div className="advanced-field"><label>Jeugd</label><select value={form.audienceCode} onChange={(event) => setField("audienceCode", event.target.value)}>{YOUTH.map(([value, label]) => <option key={value || "empty"} value={value}>{label}</option>)}</select></div>
            <div className="advanced-field"><label>Inhoud</label><input value={form.content} onChange={(event) => setField("content", event.target.value)} /></div>

            <label className="advanced-check">
              <input type="checkbox" checked={form.available} onChange={(event) => setField("available", event.target.checked)} />
              <span>Alleen beschikbare titels</span>
            </label>
          </div>

          <div className="advanced-actions">
            <button type="submit" className="advanced-submit" disabled={loading}>VIND</button>
            <button type="button" className="advanced-clear" onClick={reset}>WISSEN</button>
          </div>
        </form>

        {error ? <div className="search-error">Fout: {error}</div> : null}
        {loading ? <div className="search-loading">Zoeken...</div> : null}

        {data ? (
          <section className="advanced-results">
            <div className="advanced-results-head"><h2>{total} resultaten</h2></div>
            <div className="oba-result-list">
              {results.map((item) => {
                const meta = metadata(item);
                const id = resultId(item);
                const title = text(meta.title);
                const author = asArray(meta.author).map(text).filter(Boolean).join(", ");
                const year = text(meta.publicationYear);
                const medium = asArray(meta.mediumTypeLabel).map(text).filter(Boolean).join(", ");
                const description = text(meta.description);

                return (
                  <article className="oba-result-item" key={id || item.id}>
                    <div>
                      <Link href={id ? `/oba-detail/${encodeURIComponent(id)}` : "#"} className="oba-result-title">
                        {title || "Onbekende titel"}
                      </Link>
                      {author ? <div className="oba-result-author">{author}</div> : null}
                      <div className="oba-result-meta">{[year, medium].filter(Boolean).join(" | ")}</div>
                      {description ? <p className="oba-result-summary">{description}</p> : null}
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
