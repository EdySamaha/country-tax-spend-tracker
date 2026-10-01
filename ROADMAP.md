# Roadmap

**How Canada Spends** starts as a deliberately tight MVP — one trustworthy data source, one
flagship experience (compare two governments' spending by function). Everything below is
sequenced so each phase ships something useful on its own.

## ✅ Phase 0 — MVP (done)

- Single official source: Statistics Canada **CCOFOG** table `10-10-0024-01`, pulled via the
  free WDS API.
- All 14 governments (federal + 10 provinces + 3 territories) on one comparable category scheme.
- Clickable Canada map (real projected geometry), single-jurisdiction breakdown, and the
  flagship **two-jurisdiction comparison** with plain-language insights.
- Dark mode, mobile layout, shareable URLs, methodology page, per-figure source links.
- Fully static build → ~free hosting.

## Phase 1 — Time & context

- **Year-over-year trends** (table already covers 2008–2024): a per-category line/area view.
- **Planned vs actual**: layer in *Main Estimates / Budgets* (planned) alongside *Public
  Accounts* (actuals) via the open.canada.ca CKAN API, with a clear toggle.
- **Per-capita and share-of-GDP** normalizations for fairer cross-jurisdiction comparison.

## Phase 2 — Down to the project level

- **Federal Grants & Contributions explorer** (~1.19M proactive-disclosure records): searchable
  and mappable by recipient, program, department, and geography — the "where did *this* money
  actually go" layer.
- Drill-down from a function → programs → individual grants.

## Phase 3 — Deeper provincial detail

- Native provincial budget adapters (Ontario, BC, Quebec CKAN portals first) for richer,
  province-specific program breakdowns beyond the CCOFOG functions.
- Keep StatCan CCOFOG as the comparability spine so cross-jurisdiction views stay consistent.

## Phase 4 — Engagement

- **"Build your own budget"** interactive: allocate the pie yourself, then reveal how the
  government actually did.
- Municipal/local governments where open data allows.
- Optional: other countries, reusing the same pipeline → normalized-JSON → static-app pattern.

## Non-goals (for now)

- Personalized "your individual tax bill" calculators — this project is intentionally about
  **aggregate allocation**, not individual liability.
- Editorializing the numbers. We present official data and cite it; interpretation is left to
  the reader.
