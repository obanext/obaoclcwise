import { useMemo, useState } from "react";
import { useRouter } from "next/router";

const DEFAULT_SEARCH_SCOPE = "anything";
const DEFAULT_CATALOG_PERSPECTIVE_ID = "3682";
const DEFAULT_BRANCH_PERSPECTIVE_ID = "3682";

const CATALOG_OPTIONS = [
  { label: "In jouw bibliotheek", perspectiveId: "3682", backend: "wise" },
  { label: "In de buurt", perspectiveId: "3683", backend: "wise" },
  { label: "e-books", perspectiveId: "3684", backend: "nbcplus" },
  { label: "luisterboeken", perspectiveId: "3685", backend: "nbcplus" },
  { label: "In dit systeem", perspectiveId: "3686", backend: "wise" },
  { label: "In heel Nederland", perspectiveId: "3687", backend: "nbcplus" },
  { label: "Delpher boeken", perspectiveId: "3688", backend: "nbcplus" },
];

const AMSTELLAND_BRANCH_OPTIONS = [
  { label: "A'veen Stadsplein", branchId: "1000" },
  { label: "A'veen Westwijk", branchId: "1001" },
  { label: "Aalsmeer", branchId: "1002" },
  { label: "Uithoorn", branchId: "1003" },
  { label: "Kudelstaart", branchId: "1004" },
];

const RADIO_OPTIONS = [
  "OBA Collectie",
  "Agenda",
  "Website",
  "E-books en luisterboeken",
  "Landelijke collectie",
  "Muziekweb",
];

const QUICK_LINKS = [
  "Pluche",
  "Zoals sneeuw valt",
  "Judith Fanto",
  "Superjuffie",
  "Voor ieder wat waars",
  "Anya Niewierra",
  "OBA locaties",
  "Max Havelaar",
];

function buildPreselectValue(type, value) {
  return `${type}:${value || "all"}`;
}

function parsePreselect(value) {
  const [type = "catalog", rawValue = DEFAULT_CATALOG_PERSPECTIVE_ID] = String(value || "").split(":");
  return { type, value: rawValue === "all" ? "" : rawValue };
}

export default function OldSchoolSearchPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [preselect, setPreselect] = useState(buildPreselectValue("catalog", DEFAULT_CATALOG_PERSPECTIVE_ID));
  const [filterAvailableTitles, setFilterAvailableTitles] = useState(false);

  const selectedLabel = useMemo(() => {
    const selected = parsePreselect(preselect);

    if (selected.type === "branch") {
      return (
        AMSTELLAND_BRANCH_OPTIONS.find((option) => option.branchId === selected.value)?.label ||
        "Amstelland"
      );
    }

    return (
      CATALOG_OPTIONS.find((option) => option.perspectiveId === selected.value)?.label ||
      "In jouw bibliotheek"
    );
  }, [preselect]);

  function submitSearch(event) {
    event.preventDefault();

    const params = new URLSearchParams();
    const selected = parsePreselect(preselect);

    if (query.trim()) params.set("q", query.trim());

    params.set("page", "1");
    params.set("searchScope", DEFAULT_SEARCH_SCOPE);
    params.set("sort", "2910");

    if (selected.type === "branch") {
      params.set("perspectiveId", DEFAULT_BRANCH_PERSPECTIVE_ID);
      params.append("facetFilter", `branchId:${selected.value}`);
    } else {
      params.set("perspectiveId", selected.value || DEFAULT_CATALOG_PERSPECTIVE_ID);
    }

    if (filterAvailableTitles) {
      params.set("filterAvailableTitles", "true");
    }

    router.push(`/oclc-search?${params.toString()}`);
  }

  return (
    <main>
      <div className="header-image">
        <img src="/header.JPG" alt="OBA" />
      </div>

      <div className="container old-school-page">
        <nav className="old-school-breadcrumb" aria-label="Breadcrumb">
          <a href="/">← Terug</a>
          <span className="old-school-home" aria-hidden="true">⌂</span>
          <span>Zoeken</span>
        </nav>

        <section className="old-school-search-panel">
          <h1>Zoeken</h1>

          <div className="old-school-radio-row" aria-label="Zoek in">
            <p>Zoek in</p>
            <div className="old-school-radio-options">
              {RADIO_OPTIONS.map((label, index) => (
                <label key={label} className="old-school-radio-option">
                  <input type="radio" name="search-in" checked={index === 0} readOnly />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <form className="old-school-form" onSubmit={submitSearch}>
            <div className="old-school-combined-search">
              <label className="sr-only" htmlFor="old-school-preselect">
                Voorselectie
              </label>

              <select
                id="old-school-preselect"
                className="old-school-select"
                value={preselect}
                onChange={(event) => setPreselect(event.target.value)}
              >
                <optgroup label="Catalogi uit OCLC Wise perspectives">
                  {CATALOG_OPTIONS.map((option) => (
                    <option
                      key={option.perspectiveId}
                      value={buildPreselectValue("catalog", option.perspectiveId)}
                    >
                      {option.label}
                    </option>
                  ))}
                </optgroup>

                <optgroup label="Locaties Amstelland via branchId facet">
                  {AMSTELLAND_BRANCH_OPTIONS.map((option) => (
                    <option
                      key={option.branchId}
                      value={buildPreselectValue("branch", option.branchId)}
                    >
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              </select>

              <div className="old-school-search-input-wrap">
                <span className="old-school-search-icon" aria-hidden="true">⌕</span>
                <input
                  className="old-school-search-input"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Zoek in de collectie, agenda of website"
                  aria-label="Zoekterm"
                />
              </div>
            </div>

            <button className="old-school-submit" type="submit" aria-label="Zoeken">
              →
            </button>

            <label className="old-school-available-toggle">
              <input
                type="checkbox"
                checked={filterAvailableTitles}
                onChange={(event) => setFilterAvailableTitles(event.target.checked)}
              />
              <span>Aanwezig</span>
            </label>
          </form>

          <p className="old-school-debug-line">
            Actieve voorselectie: <strong>{selectedLabel}</strong>. Bij zoeken wordt doorgestuurd naar
            <code>/oclc-search</code> met <code>perspectiveId</code>, eventueel
            <code>facetFilter=branchId:&lt;id&gt;</code> en
            <code>filterAvailableTitles=true</code>.
          </p>
        </section>

        <section className="old-school-quick-links" aria-label="Populaire zoektermen">
          <h2>Populaire zoektermen</h2>
          <div className="old-school-quick-grid">
            {QUICK_LINKS.map((term) => (
              <span key={term}>{term}</span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
