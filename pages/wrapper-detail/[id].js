import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { buildDetailMappingRows } from "../../utils/mappingRows";
import { toDetailMappingCsv } from "../../utils/csv";

const pretty = (value) => JSON.stringify(value, null, 2);

const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const text = (value) => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const getBranchField = (branch, key) =>
  asArray(branch?.branches).find((item) => item?._attributes?.key === key)?._text || "";

const nodeText = (value) => {
  if (Array.isArray(value)) return value.map(nodeText).filter(Boolean).join(", ");
  if (value && typeof value === "object") return text(value._text);
  return text(value);
};

const nodeAttr = (value, key) => text(value?._attributes?.[key]);

const firstNode = (value) => asArray(value)[0] || null;

const nodeListText = (value) => asArray(value).map(nodeText).filter(Boolean).join(", ");

const marcText = (mapped, field, key = "a") => {
  const marc = mapped?.["librarian-info"]?.record?.marc || {};
  const wrapper = marc?.[field];
  const nodes = asArray(wrapper?.[field]);
  const match = nodes.find((item) => nodeAttr(item, "key") === key);
  return nodeText(match);
};

function formatNodeList(value) {
  return asArray(value).map((item) => nodeText(item)).filter(Boolean).join(", ");
}

function flattenOclc(value, prefix = "") {
  const rows = [];

  if (value === null || value === undefined) {
    rows.push({ field: prefix, value: "" });
    return rows;
  }

  if (typeof value !== "object") {
    rows.push({ field: prefix, value });
    return rows;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      rows.push({ field: prefix, value: "" });
      return rows;
    }

    value.forEach((item, index) => {
      rows.push(...flattenOclc(item, `${prefix}[${index}]`));
    });

    return rows;
  }

  const keys = Object.keys(value);

  if (!keys.length) {
    rows.push({ field: prefix, value: "" });
    return rows;
  }

  keys.forEach((key) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    rows.push(...flattenOclc(value[key], nextPrefix));
  });

  return rows;
}

export default function Page() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState(null);
  const [tab, setTab] = useState("availability");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!router.isReady || !id) return;

    let cancelled = false;
    setError("");
    setData(null);

    fetch(`/api/wrapper-detail?id=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const json = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(json?.error || `Request failed with status ${response.status}`);
        }

        return json;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Onbekende fout");
      });

    return () => {
      cancelled = true;
    };
  }, [router.isReady, id]);

  const parsedJson = data?.parsedJson || data?.mapped || {};
  const mapped = parsedJson;
  const raw = data?.raw || {};
  const calls = asArray(raw?.debug?.calls);

  const title = text(mapped?.titles?.title?._text);
  const shortTitle = text(mapped?.titles?.["short-title"]?._text);
  const subtitle = text(mapped?.titles?.["origin-title"]?._text);
  const author = text(mapped?.authors?.["main-author"]?._text);
  const summary = text(mapped?.summaries?.summary?._text);

  const coverImage = useMemo(() => {
    const cover = mapped?.coverimages?.coverimage;
    if (Array.isArray(cover)) return text(cover[0]?._text);
    return text(cover?._text);
  }, [mapped]);

  const topSpecs = useMemo(() => {
    return [
      text(asArray(mapped?.formats?.format).map((item) => item?._text).filter(Boolean).join(", ")),
      text(mapped?.languages?.language?._text),
      text(mapped?.publication?.publishers?.publisher?._text),
      text(
        [
          mapped?.description?.pages?._text,
          mapped?.description?.["physical-description"]?._text,
          mapped?.description?.size?._text,
        ]
          .filter(Boolean)
          .join(" ; ")
      ),
      formatNodeList(mapped?.series?.["series-title"]),
      text(mapped?.["target-audiences"]?.["target-audience"]?._text),
    ].filter(Boolean);
  }, [mapped]);

  const subjects = useMemo(() => {
    return asArray(mapped?.subjects?.["topical-subject"])
      .map((item) => text(item?._text))
      .filter(Boolean);
  }, [mapped]);

  const specRows = useMemo(() => {
    const rows = [
      ["ISBN Nummer", text(mapped?.identifiers?.["isbn-id"]?._text)],
      ["PPN Nummer", text(mapped?.identifiers?.["ppn-id"]?._text)],
      ["Boekcode", text(mapped?.id?._attributes?.nativeid)],
      ["Taal publicatie", text(mapped?.languages?.language?._text)],
      ["Taal - Originele taal", text(mapped?.languages?.["original-language"]?._text)],
      ["Hoofdtitel", title],
      ["Algemene materiaalaanduiding", formatNodeList(mapped?.formats?.format)],
      ["Eerste verantwoordelijke", author],

      [
        "Titel - Volgende verantwoordelijken",
        formatNodeList(mapped?.authors?.author),
      ],
      ["Plaats van uitgave", nodeAttr(mapped?.publication?.publishers?.publisher, "place")],
      ["Uitgever", text(mapped?.publication?.publishers?.publisher?._text)],
      ["Jaar van uitgave", text(mapped?.publication?.year?._text)],
      ["Pagina's", text(mapped?.description?.pages?._text)],
      ["Collatie - Illustraties", text(mapped?.description?.["physical-description"]?._text)],
      ["Centimeters", marcText(mapped, "df215", "d")],
      ["Annotatie", formatNodeList(mapped?.notes?.note)],
      ["Serietitel", formatNodeList(mapped?.series?.["series-title"])],
      ["Auteur Functie", nodeAttr(mapped?.authors?.["main-author"], "localized-type") || nodeAttr(mapped?.authors?.["main-author"], "translation")],
      ["Auteur Achternaam", nodeAttr(mapped?.authors?.["main-author"], "lastname")],
      ["Auteur Voornaam", nodeAttr(mapped?.authors?.["main-author"], "firstname")],
      ["Trefwoord - Hoofd geleding", nodeText(firstNode(mapped?.subjects?.["topical-subject"]))],
      ["SISO - Code", nodeText(mapped?.classification?.["siso-code"])],
      ["Auteur - secundaire - Functie", asArray(mapped?.authors?.author).map((item) => nodeAttr(item, "localized-type") || nodeAttr(item, "translation")).filter(Boolean).join(", ")],
      ["Auteur - secundaire - Achternaam", asArray(mapped?.authors?.author).map((item) => nodeAttr(item, "lastname")).filter(Boolean).join(", ")],
      ["Auteur - secundaire - Voornaam", asArray(mapped?.authors?.author).map((item) => nodeAttr(item, "firstname")).filter(Boolean).join(", ")],
      ["Prod country", marcText(mapped, "df044", "a")],
      ["Samenvatting - Tekst", summary],
      ["Bestelnummer NBD Nummer", marcText(mapped, "df014", "a")],
    ];

    return rows.filter(([, value]) => value);
  }, [mapped, title, author, summary]);

  const availabilityRows = useMemo(() => {
    return asArray(mapped?.["librarian-info"]?.record?.meta?.branches).map((branch, index) => ({
      key: `${getBranchField(branch, "b") || "row"}-${index}`,
      location:
        getBranchField(branch, "locationName") ||
        getBranchField(branch, "branchName") ||
        getBranchField(branch, "s"),
      place: getBranchField(branch, "m"),
      shelf: getBranchField(branch, "k"),
      status: getBranchField(branch, "status"),
    }));
  }, [mapped]);

  const oclcRows = useMemo(() => {
    return [
      { type: "section", field: "title — bibliografisch", value: "" },
      ...flattenOclc(raw?.title, "title"),

      { type: "section", field: "availability — beschikbaarheid", value: "" },
      ...flattenOclc(raw?.availability, "availability"),

      { type: "section", field: "summary — titelrelaties/samenvatting", value: "" },
      ...flattenOclc(raw?.summary, "summary"),

      { type: "section", field: "itemInformation — holdings/exemplaren", value: "" },
      ...flattenOclc(raw?.itemInformation, "itemInformation"),
    ];
  }, [raw]);

  const csvRows = useMemo(() => buildDetailMappingRows(raw, mapped), [raw, mapped]);

  const downloadCsv = () => {
    try {
      const csv = toDetailMappingCsv(csvRows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.setAttribute("download", `detailpagina-mapping-${id}.csv`);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("CSV download mislukt", downloadError);
      window.alert("CSV download mislukt. Controleer de console.");
    }
  };

  if (error) {
    return <div className="container">Fout: {error}</div>;
  }

  if (!data) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="page">
      <div className="header-image">
        <img src="/header.JPG" alt="Header" />
      </div>

      <div className="container detail-page">
        <section className="hero">
          <div className="hero-left">
            <h1 className="title">{title || shortTitle || "Onbekende titel"}</h1>

            {subtitle && subtitle !== title && subtitle !== shortTitle ? (
              <div className="subtitle">{subtitle}</div>
            ) : null}

            {author ? <div className="author-line">{author}</div> : null}

            {summary ? <div className="summary-text">{summary}</div> : null}

            <div className="card-grid top-cards">
              <section className="info-card">
                <h2>Specificaties</h2>

                {topSpecs.length ? (
                  <ul className="plain-list">
                    {topSpecs.map((value, index) => (
                      <li key={`${value}-${index}`}>{value}</li>
                    ))}
                  </ul>
                ) : (
                  <ul className="plain-list">
                    <li>Geen specificaties beschikbaar</li>
                  </ul>
                )}
              </section>

              <section className="info-card">
                <h2>Onderwerpen</h2>

                {subjects.length ? (
                  <ul className="plain-list">
                    {subjects.map((value, index) => (
                      <li key={`${value}-${index}`}>{value}</li>
                    ))}
                  </ul>
                ) : (
                  <ul className="plain-list">
                    <li>Geen onderwerpen beschikbaar</li>
                  </ul>
                )}
              </section>
            </div>
          </div>

          <div className="hero-right">
            {coverImage ? (
              <img src={coverImage} className="cover-large" alt={title || shortTitle || "Cover"} />
            ) : (
              <div className="cover-placeholder">Geen cover</div>
            )}
          </div>
        </section>

        <div className="section-header">
          <h2>Praktische informatie</h2>

          <div className="tab-buttons">
            <button
              type="button"
              className={tab === "specs" ? "tab-button active" : "tab-button"}
              onClick={() => setTab("specs")}
            >
              specificaties
            </button>

            <button
              type="button"
              className={tab === "availability" ? "tab-button active" : "tab-button"}
              onClick={() => setTab("availability")}
            >
              beschikbaarheid
            </button>

            <button
              type="button"
              className={tab === "oclc" ? "tab-button active" : "tab-button"}
              onClick={() => setTab("oclc")}
            >
              alles oclc
            </button>
          </div>
        </div>

        {tab === "availability" ? (
          <section className="table-card">
            <div className="table-wrap">
              <table className="detail-table">
                <thead>
                  <tr>
                    <th>Locatie</th>
                    <th>Plaats</th>
                    <th>Signatuur</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {availabilityRows.length ? (
                    availabilityRows.map((row) => (
                      <tr key={row.key}>
                        <td>{row.location || "—"}</td>
                        <td>{row.place || "—"}</td>
                        <td>{row.shelf || "—"}</td>
                        <td>{row.status || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td>—</td>
                      <td>—</td>
                      <td>—</td>
                      <td>Geen exemplaren beschikbaar</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : tab === "specs" ? (
          <section className="specs-list">
            {specRows.length ? (
              specRows.map(([label, value]) => (
                <div className="spec-row" key={label}>
                  <div className="spec-label">{label}</div>
                  <div className="spec-value">{value}</div>
                </div>
              ))
            ) : (
              <div className="spec-row">
                <div className="spec-label">Specificaties</div>
                <div className="spec-value">Geen specificaties beschikbaar</div>
              </div>
            )}
          </section>
        ) : (
          <section className="specs-list">
            {oclcRows.map((row, index) =>
              row.type === "section" ? (
                <div className="spec-row" key={`${row.field}-${index}`}>
                  <div className="spec-label" style={{ fontWeight: 700 }}>
                    {row.field}
                  </div>
                  <div className="spec-value"></div>
                </div>
              ) : (
                <div className="spec-row" key={`${row.field}-${index}`}>
                  <div className="spec-label">{row.field}</div>
                  <div className="spec-value">{text(row.value)}</div>
                </div>
              )
            )}
          </section>
        )}

        <section className="debug-section">
          <button type="button" className="tab-button" onClick={downloadCsv}>
            Download mapping CSV
          </button>

          <details className="debug-block">
            <summary>OCLC API calls</summary>

            <div className="debug-content">
              {calls.length ? (
                calls.map((call, index) => (
                  <details className="debug-call" key={`${call?.url || "call"}-${index}`}>
                    <summary>
                      {call?.url || "Onbekende call"} | {call?.status || "?"}
                    </summary>

                    <pre>{pretty(call?.body ?? call)}</pre>
                  </details>
                ))
              ) : (
                <pre>Geen calls beschikbaar</pre>
              )}
            </div>
          </details>

          <details className="debug-block">
            <summary>Wrapper detail — parsed JSON</summary>

            <div className="debug-content">
              <pre>{pretty(parsedJson)}</pre>
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
