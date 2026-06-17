import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const pretty = (value) => JSON.stringify(value, null, 2);

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

function coverUrl(result = {}) {
  const ppn = encodeURIComponent(text(result.ppn));
  const isbn = encodeURIComponent(text(result.isbn));

  if (text(result.cover)) return text(result.cover);
  if (!ppn && !isbn) return "";

  return `https://cover.biblion.nl/coverlist.dll/?doctype=morebutton&bibliotheek=oba&style=0&ppn=${ppn}&isbn=${isbn}&lid=&aut=&ti=&size=150`;
}

function resultTitle(result = {}) {
  return text(result.short_title || result.title || result.name || result.titel);
}

function resultMeta(result = {}) {
  return [
    text(result.author || result.auteur),
    text(result.year || result.jaar || result.date),
    text(result.location),
    text(result.ppn ? `PPN ${result.ppn}` : ""),
  ].filter(Boolean).join(" | ");
}

export default function NexiSearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [threadId, setThreadId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    const q = typeof router.query.q === "string" ? router.query.q : "";
    const tid = typeof router.query.thread_id === "string" ? router.query.thread_id : "";

    setQuery(q);
    setThreadId(tid);

    if (q) runSearch(q, tid, false);
  }, [router.isReady]);

  function buildUrl(nextQuery, nextThreadId) {
    const params = new URLSearchParams();
    if (text(nextQuery)) params.set("q", text(nextQuery));
    if (text(nextThreadId)) params.set("thread_id", text(nextThreadId));
    const qs = params.toString();
    return qs ? `/nexi-search?${qs}` : "/nexi-search";
  }

  function buildApiUrl(nextQuery, nextThreadId) {
    const params = new URLSearchParams();
    if (text(nextQuery)) params.set("q", text(nextQuery));
    if (text(nextThreadId)) params.set("thread_id", text(nextThreadId));
    return `/api/nexi-search?${params.toString()}`;
  }

  function runSearch(nextQuery = query, nextThreadId = threadId, updateUrl = true) {
    const q = text(nextQuery);
    if (!q) return;

    setLoading(true);
    setError("");

    fetch(buildApiUrl(q, nextThreadId))
      .then(async (response) => {
        const json = await response.json().catch(() => null);
        if (!response.ok) throw new Error(json?.error || `Request failed with status ${response.status}`);
        return json;
      })
      .then((json) => {
        setData(json);
        setThreadId(text(json?.thread_id));
        if (updateUrl) router.push(buildUrl(q, json?.thread_id), undefined, { shallow: true });
      })
      .catch((err) => setError(err.message || "Onbekende fout"))
      .finally(() => setLoading(false));
  }

  function submit(event) {
    event.preventDefault();
    runSearch(query, threadId, true);
  }

  function clearSearch() {
    setQuery("");
    setData(null);
    setError("");
    router.push("/nexi-search", undefined, { shallow: true });
  }

  const response = data?.response || null;
  const responseType = text(response?.type);
  const results = asArray(data?.results);
  const hasQuery = Boolean(text(query));

  return (
    <div className="page">
      <div className="header-image">
        <img src="/header.JPG" alt="Header" />
      </div>

      <div className="container search-page oba-search-page">
        <nav className="oba-breadcrumbs" aria-label="Broodkruimelpad">
          <Link href="/" className="oba-chip">← Terug</Link>
          <span className="oba-chip oba-chip-dark">⌂</span>
          <span className="oba-chip">Zoeken met natuurlijke taal</span>
        </nav>

        <section className="oba-search-top">
          <form className="oba-search-form" onSubmit={submit}>
            <div className="search-input-wrap">
              <input
                className="oba-search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Waar ben je naar op zoek?"
                aria-label="Zoeken met natuurlijke taal"
              />

              {query ? (
                <button type="button" className="oba-search-clear" onClick={clearSearch}>
                  ×
                </button>
              ) : null}
            </div>

            <button type="submit" className="oba-search-submit" aria-label="Zoeken">
              →
            </button>
          </form>
        </section>

        {error ? <div className="search-error">Fout: {error}</div> : null}
        {loading ? <div className="search-loading">Zoeken...</div> : null}

        <section className="oba-search-layout">
          <aside className="oba-filter-panel">
            <div className="filter-card filter-card-open">
              <div className="filter-card-title">Afhandeling</div>
              <div className="filter-options">
                <div className="filter-empty">Nexi</div>
              </div>
            </div>

            {responseType ? (
              <div className="filter-card filter-card-open">
                <div className="filter-card-title">Type</div>
                <div className="filter-options">
                  <div className="filter-empty">{responseType}</div>
                </div>
              </div>
            ) : null}
          </aside>

          <main className="oba-results-panel">
            <div className="oba-results-heading">
              <div>
                <h1>{hasQuery ? `'${text(data?.query) || query}'` : "Zoeken met natuurlijke taal"}</h1>
                <div className="oba-result-count">
                  {hasQuery ? `${results.length.toLocaleString("nl-NL")} resultaten via Nexi` : "Typ een natuurlijke-taal zoekvraag."}
                </div>
              </div>
            </div>

            {response?.message ? <div className="info-card">{response.message}</div> : null}

            {hasQuery ? (
              <section className="oba-result-list">
                {results.length ? (
                  results.map((result, index) => {
                    const title = resultTitle(result);
                    const image = coverUrl(result);
                    const link = text(result.link || result.url);
                    const meta = resultMeta(result);
                    const summary = text(result.summary || result.description || result.omschrijving);

                    return (
                      <article className="oba-result-item" key={`${result.ppn || title || "result"}-${index}`}>
                        {image ? (
                          <img src={image} alt={title || "Cover"} className="oba-result-cover" />
                        ) : (
                          <div className="oba-result-cover empty-cover">Geen cover</div>
                        )}

                        <div className="oba-result-body">
                          {link ? (
                            <a href={link} className="oba-result-title" target="_blank" rel="noreferrer">
                              {title || "Onbekende titel"}
                            </a>
                          ) : (
                            <span className="oba-result-title">{title || "Onbekende titel"}</span>
                          )}

                          {meta ? <div className="oba-result-meta">{meta}</div> : null}
                          {summary ? <p className="oba-result-summary">{summary}</p> : null}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="info-card">Geen resultaten</div>
                )}
              </section>
            ) : null}
          </main>
        </section>

        <section className="debug-section">
          <details className="debug-block">
            <summary>Nexi output</summary>
            <div className="debug-content">
              <pre>{pretty(data)}</pre>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
