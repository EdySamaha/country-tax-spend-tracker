import { useEffect, useMemo, useState } from "react";
import CanadaMap from "./components/CanadaMap";
import Breakdown from "./components/Breakdown";
import SpendingDetail from "./components/SpendingDetail";
import Compare from "./components/Compare";
import Methodology from "./components/Methodology";
import { loadIndex, loadJurisdiction, sliceYear } from "./lib";
import type { IndexFile, JurisdictionSeries } from "./types";

type View = "home" | "methodology";

function parseHash(): { view: View; selected: string[]; year: string } {
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (h.get("view") === "methodology") return { view: "methodology", selected: [], year: "" };
  const sel = (h.get("sel") ?? "").split(",").filter(Boolean).slice(0, 2);
  return { view: "home", selected: sel, year: h.get("yr") ?? "" };
}

export default function App() {
  const initial = parseHash();
  const [view, setView] = useState<View>(initial.view);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [year, setYear] = useState<string>(initial.year);
  const [index, setIndex] = useState<IndexFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Record<string, JurisdictionSeries>>({});
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("theme") ?? "light");

  // Theme
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Index — once loaded, default the year to the latest available (unless the
  // URL already pinned a valid one).
  useEffect(() => {
    loadIndex()
      .then((idx) => {
        setIndex(idx);
        setYear((y) => (y && idx.availableYears.includes(y) ? y : idx.latestYear));
      })
      .catch((e) => setError(String(e)));
  }, []);

  // Load selected jurisdiction data
  useEffect(() => {
    selected.forEach((code) => {
      if (!loaded[code]) {
        loadJurisdiction(code)
          .then((j) => setLoaded((prev) => ({ ...prev, [code]: j })))
          .catch((e) => setError(String(e)));
      }
    });
  }, [selected, loaded]);

  // Keep the URL hash in sync (shareable comparisons)
  useEffect(() => {
    const params = new URLSearchParams();
    if (view === "methodology") params.set("view", "methodology");
    else if (selected.length) {
      params.set("sel", selected.join(","));
      if (year && index && year !== index.latestYear) params.set("yr", year);
    }
    const hash = params.toString();
    window.history.replaceState(null, "", hash ? `#${hash}` : window.location.pathname);
  }, [view, selected, year, index]);

  const names = useMemo(() => {
    const m: Record<string, string> = {};
    index?.jurisdictions.forEach((j) => (m[j.code] = j.name));
    return m;
  }, [index]);

  function toggle(code: string) {
    setView("home");
    setSelected((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length < 2) return [...prev, code];
      return [prev[1], code]; // full: drop oldest
    });
  }

  const swatchClass = (code: string) => (selected[0] === code ? "a" : "b");

  const seriesA = selected[0] ? loaded[selected[0]] : undefined;
  const seriesB = selected[1] ? loaded[selected[1]] : undefined;
  const a = seriesA && year ? sliceYear(seriesA, year) : undefined;
  const b = seriesB && year ? sliceYear(seriesB, year) : undefined;
  const detailJs = [a, b].filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <>
      <header className="site-header">
        <div className="container">
          <div className="brand">
            <h1 onClick={() => { setView("home"); }}>How Canada Spends</h1>
            <span className="tagline">Where your tax money goes — federal, provincial &amp; territorial</span>
          </div>
          <nav className="nav">
            <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>
              Explore
            </button>
            <button className={view === "methodology" ? "active" : ""} onClick={() => setView("methodology")}>
              Methodology
            </button>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
              {theme === "dark" ? "☀" : "☾"}
            </button>
          </nav>
        </div>
      </header>

      <main className="container">
        {error && <div className="error">Could not load data: {error}</div>}

        {view === "methodology" ? (
          <div style={{ paddingTop: 8 }}>
            <Methodology index={index} />
          </div>
        ) : (
          <>
            <div className="banner">
              <b>Aggregate view, not your personal taxes.</b> This shows how each government allocates its
              whole budget across categories. Money is fungible, so these are proportional shares — see{" "}
              <a href="#view=methodology" onClick={() => setView("methodology")}>Methodology</a>.
            </div>

            <div className="split">
              <div className="left-col">
              <div className="card map-wrap">
                <p className="map-help">
                  Click a province or territory to see how it spends. Pick <b>two</b> to compare them
                  side by side.
                </p>
                <CanadaMap names={names} selected={selected} onToggle={toggle} />

                <div className="picker-row">
                  <select
                    value=""
                    onChange={(e) => e.target.value && toggle(e.target.value)}
                    aria-label="Add a jurisdiction"
                  >
                    <option value="">Add from list…</option>
                    {index?.jurisdictions.map((j) => (
                      <option key={j.code} value={j.code} disabled={selected.includes(j.code)}>
                        {j.name}
                      </option>
                    ))}
                  </select>
                  {index && index.availableYears.length > 1 && (
                    <label className="year-picker">
                      <span>Fiscal year</span>
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        aria-label="Fiscal year"
                      >
                        {[...index.availableYears].reverse().map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {selected.map((code) => (
                    <span className="chip" key={code}>
                      <span className={`swatch ${swatchClass(code)}`} style={{ background: swatchClass(code) === "a" ? "var(--series-1)" : "var(--series-2)" }} />
                      {names[code] ?? code}
                      <button onClick={() => toggle(code)} aria-label={`Remove ${names[code] ?? code}`}>×</button>
                    </span>
                  ))}
                  {selected.length > 0 && (
                    <button className="btn ghost" onClick={() => setSelected([])}>Clear</button>
                  )}
                </div>
              </div>

              {detailJs.length > 0 && <SpendingDetail js={detailJs} />}
              </div>

              <div>
                {selected.length === 0 && (
                  <div className="card">
                    <h2 className="section-title">Pick a place to begin</h2>
                    <p className="lead">
                      Select any province or territory on the map to see how it divides its budget across
                      health, education, social protection, and more — then add a second to compare, like
                      Ontario vs Quebec, or your province vs the federal government.
                    </p>
                    {index && (
                      <p className="muted" style={{ marginTop: 14 }}>
                        {index.availableYears.length} fiscal years through {index.latestYear} ·{" "}
                        {index.jurisdictions.length} governments · Statistics Canada open data.
                      </p>
                    )}
                  </div>
                )}

                {selected.length === 1 &&
                  (a ? (
                    <Breakdown j={a} />
                  ) : (
                    <div className="loading card">Loading {names[selected[0]]}…</div>
                  ))}

                {selected.length === 2 &&
                  (a && b ? <Compare a={a} b={b} /> : <div className="loading card">Loading comparison…</div>)}
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="container">
          Data: Statistics Canada, table 10-10-0024-01 (CCOFOG), used under the{" "}
          <a href="https://open.canada.ca/en/open-government-licence-canada" target="_blank" rel="noreferrer">
            Open Government Licence – Canada
          </a>
          . This is an independent project and is not affiliated with or endorsed by any government.
          Figures are consolidated actuals and approximate; see Methodology.
        </div>
      </footer>
    </>
  );
}
