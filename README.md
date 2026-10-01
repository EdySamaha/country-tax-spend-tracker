# How Canada Spends

A simple, visual web app that shows **how governments in Canada allocate their spending** —
federal, provincial, and territorial — by function (health, education, social protection, …),
and lets you **compare any two jurisdictions** side by side.

It is an *aggregate* view of where public money goes, not a calculator of anyone's personal
tax bill. Every figure comes from official Statistics Canada open data and links back to its
source.

## What it does (MVP)

- **Clickable map of Canada** — pick a province/territory to see its spending breakdown.
- **Compare two** — pick a second (e.g. Ontario vs Quebec, or a province vs federal) for a
  passport-index-style side-by-side of budget shares, with plain-language highlights.
- **Honest by design** — a methodology page, per-figure source links, and clear framing that
  these are proportional shares of a fungible budget (consolidated actuals, with a reporting lag).

## Data source

Statistics Canada table **10-10-0024-01** — *Canadian Classification of Functions of Government
(CCOFOG), by general government component*, pulled via the free StatCan Web Data Service (WDS).
Used under the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada).

Using one source means every jurisdiction is measured on the **same category scheme**, which is
what makes fair comparisons possible.

## Project layout

```
pipeline/
  build_data.py   # fetch WDS CSV -> normalized JSON per jurisdiction (+ index, sources)
  build_map.py    # project province geometry (Lambert Conformal Conic) -> compact SVG paths
  geo/            # source GeoJSON (input to build_map.py)
web/
  public/data/    # generated JSON consumed by the app (committed)
  src/
    data/geo.ts   # generated map paths (committed)
    components/   # CanadaMap, Breakdown, Compare, Methodology
    App.tsx, lib.ts, types.ts, styles.css
data/raw/         # raw StatCan download (git-ignored, regenerated)
```

## Running it

**Refresh the data** (annually, when StatCan publishes a new year):

```bash
python pipeline/build_data.py     # -> web/public/data/*.json
python pipeline/build_map.py      # -> web/src/data/geo.ts (only needed if geometry changes)
```

**Run the web app:**

```bash
cd web
npm install
npm run dev       # local dev server
npm run build     # static production build in web/dist/
```

The build is fully static (`web/dist/`) and can be hosted for ~free on Cloudflare Pages,
Netlify, Vercel, or GitHub Pages.

## Nuances & caveats (read this)

This app is honest about being an **approximation**. The important nuances:

- **Money is fungible.** No tax dollar is truly earmarked. A "share" describes how the pooled
  budget is allocated across functions — not a literal path your specific dollars took.
- **Consolidated actuals, with a lag.** Figures are audited actuals from StatCan, so the newest
  year available is typically one to two years behind the current fiscal year. It is not a live
  budget tracker.
- **Each government's *own* spending only.** For a province we show the *provincial/territorial
  government* component. Municipalities, school boards, universities/colleges, and pension plans
  (CPP/RRQ) are separate components in the source and are **not** folded in — so totals here are
  smaller than a fully consolidated public-sector figure.
- **Comparisons use budget *share*, not dollars.** A $3B territory and a $520B federal government
  are compared by how they split their own budget, which is the fair basis. Absolute dollars are
  shown per jurisdiction but not used to rank one against another.
- **Function-level only, for now.** The view is by the 10 top-level CCOFOG functions. Individual
  programs, projects, and grants are a planned addition (see the roadmap).
- **Not official.** Independent project; not affiliated with or endorsed by any government. The
  data is official and cited; the presentation is ours.

## Roadmap

See **[ROADMAP.md](ROADMAP.md)** — near-term: year-over-year trends and planned-vs-actual;
then a federal project/grant explorer, deeper provincial detail, and a "build your own budget"
interactive.

---

*Independent project; not affiliated with or endorsed by any government. Data © Statistics
Canada, used under the Open Government Licence – Canada.*
