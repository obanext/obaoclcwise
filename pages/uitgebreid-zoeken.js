import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";

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

function yearFacet(value) {
  const year = text(value);
  if (!/^\d{4}$/.test(year)) return "";
  return `publicationYear:${year}-01-01T00:00:00Z`;
}

function determinePrimarySearch(form, queryPreview) {
  const free = text(form.q);

  if (free) {
    return { q: free, searchScope: "anything" };
  }

  const scopedFields = [
    { name: "title", value: form.title, searchScope: "title" },
    { name: "author", value: form.author, searchScope: "author" },
    { name: "subject", value: form.subject, searchScope: "subject" },
    { name: "series", value: form.series, searchScope: "series" },
  ].filter((field) => text(field.value));

  const otherTextFields = [
    form.placementCode,
    form.issn,
    form.publisher,
    form.isbn,
    form.collection,
    form.content,
  ].filter((value) => text(value));

  if (scopedFields.length === 1 && otherTextFields.length === 0) {
    return { q: text(scopedFields[0].value), searchScope: scopedFields[0].searchScope };
  }

  if (text(queryPreview)) {
    return { q: text(queryPreview), searchScope: "anything" };
  }

  return { q: "*.*", searchScope: "anything" };
}

function buildOclcSearchUrl(form, queryPreview) {
  const params = new URLSearchParams();
  const primary = determinePrimarySearch(form, queryPreview);
  const filters = [
    yearFacet(form.year),
    text(form.genreCode) ? `genreCode:${text(form.genreCode)}` : "",
    text(form.mediumTypeCode) ? `mediumTypeCode:${text(form.mediumTypeCode)}` : "",
    text(form.languageCode) ? `languageCode:${text(form.languageCode)}` : "",
    text(form.branchId) ? `branchId:${text(form.branchId)}` : "",
    text(form.audienceCode) ? `audienceCode:${text(form.audienceCode)}` : "",
  ].filter(Boolean);

  params.set("q", primary.q);
  params.set("page", "1");
  params.set("searchScope", primary.searchScope);
  params.set("sort", "2910");
  params.set("perspectiveId", "3682");

  filters.forEach((filter) => params.append("facetFilter", filter));

  if (form.available) {
    params.set("filterAvailableTitles", "true");
  }

  return `/oclc-search?${params.toString()}`;
}

export default function AdvancedSearchPage() {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const queryPreview = useMemo(() => buildQuery(form), [form]);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    router.push(buildOclcSearchUrl(form, queryPreview));
  }

  function reset() {
    setForm(emptyForm);
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
            <button type="submit" className="advanced-submit">VIND</button>
            <button type="button" className="advanced-clear" onClick={reset}>WISSEN</button>
          </div>
        </form>
      </div>
    </main>
  );
}
