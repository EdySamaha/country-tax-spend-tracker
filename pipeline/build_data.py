#!/usr/bin/env python3
"""
Build normalized tax-allocation data for "How Canada Spends".

Expenditure by function
  Statistics Canada table 10-10-0024-01
  "Canadian Classification of Functions of Government (CCOFOG),
   by general government component"
  https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1010002401

Revenue by source (taxes vs grants)
  Statistics Canada CGFS "statement of operations" tables:
    - Federal           -> 10-10-0016-01 (GEO "Canada")
    - Provincial/terr.  -> 10-10-0017-01 (GEO = each province/territory)

We pull each full table via the free StatCan Web Data Service (WDS)
`getFullTableDownloadCSV` endpoint, then emit one JSON file per
jurisdiction plus an index.

For each jurisdiction we take the government's OWN spending by function:
  - Federal    -> GEO "Canada",  component "Federal government"
  - Provinces  -> GEO <province>, component "Provincial and territorial governments"
  - Territories-> GEO <territory>,component "Provincial and territorial governments"

Only the 10 top-level COFOG divisions (3-digit codes 701-710) make up the
headline categories, so they sum to the total without double-counting. Where
a government also reports 4-digit sub-functions (the federal government does;
provinces do not), those are nested under their division as `children` so the
UI can offer an optional drill-down.
"""

from __future__ import annotations

import csv
import io
import json
import ssl
import sys
import urllib.request
import zipfile
from collections import defaultdict
from datetime import date
from pathlib import Path

PRODUCT_ID = "10100024"
TABLE_ID = "10-10-0024-01"
TABLE_URL = "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1010002401"

# CGFS statement-of-operations tables (revenue by source).
CGFS_FED = ("10100016", "10-10-0016-01", "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1010001601")
CGFS_PT = ("10100017", "10-10-0017-01", "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1010001701")

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "web" / "public" / "data"

PROV_COMPONENT = "Provincial and territorial governments"
FED_COMPONENT = "Federal government"

_SSL = ssl.create_default_context()

# code -> (display name, GEO value, component)
JURISDICTIONS = {
    "ca": ("Government of Canada (federal)", "Canada", FED_COMPONENT),
    "on": ("Ontario", "Ontario", PROV_COMPONENT),
    "qc": ("Quebec", "Quebec", PROV_COMPONENT),
    "bc": ("British Columbia", "British Columbia", PROV_COMPONENT),
    "ab": ("Alberta", "Alberta", PROV_COMPONENT),
    "mb": ("Manitoba", "Manitoba", PROV_COMPONENT),
    "sk": ("Saskatchewan", "Saskatchewan", PROV_COMPONENT),
    "ns": ("Nova Scotia", "Nova Scotia", PROV_COMPONENT),
    "nb": ("New Brunswick", "New Brunswick", PROV_COMPONENT),
    "nl": ("Newfoundland and Labrador", "Newfoundland and Labrador", PROV_COMPONENT),
    "pe": ("Prince Edward Island", "Prince Edward Island", PROV_COMPONENT),
    "yt": ("Yukon", "Yukon", PROV_COMPONENT),
    "nt": ("Northwest Territories", "Northwest Territories", PROV_COMPONENT),
    "nu": ("Nunavut", "Nunavut", PROV_COMPONENT),
}

# Whether each jurisdiction is federal / province / territory (for the UI + map).
KIND = {"ca": "federal"}
for _c in ["on", "qc", "bc", "ab", "mb", "sk", "ns", "nb", "nl", "pe"]:
    KIND[_c] = "province"
for _c in ["yt", "nt", "nu"]:
    KIND[_c] = "territory"

# --- Revenue classification (CGFS "Statement of operations and balance sheet") ---
REV_DIM = "Statement of operations and balance sheet"
REV_TOTAL = "Revenue [1]"
REV_TAXES = "Taxes [11]"
REV_GRANTS = "Grants, revenue [13]"
# The tables carry two "Display value" rows (Stocks / flows) with identical
# values for these aggregates; keep one to avoid double counting.
REV_DISPLAY = "Transactions and other economic flows"


def cofog(label: str) -> tuple[str, str] | None:
    """Return (code, clean_name) for a CCOFOG label, else None.

    Labels look like 'Health [707]' or 'Hospital services [7073]' or
    'Health not elsewhere classified [7075, 7076]' (first code wins).
    """
    if "[" not in label or not label.rstrip().endswith("]"):
        return None
    inside = label.rsplit("[", 1)[1].rstrip("]")
    first = inside.split(",")[0].strip()
    if not first.isdigit():
        return None
    return first, label.rsplit("[", 1)[0].strip()


def fetch_table(product_id: str, cache_name: str) -> list[dict]:
    """Fetch a WDS full-table CSV (zip), with a cached fallback in data/raw."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = RAW_DIR / cache_name
    wds = f"https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/{product_id}/en"
    try:
        with urllib.request.urlopen(wds, timeout=90, context=_SSL) as resp:
            meta = json.load(resp)
        if meta.get("status") != "SUCCESS":
            raise RuntimeError(f"WDS returned status {meta.get('status')}")
        url = meta["object"]
        print(f"Downloading {url}")
        with urllib.request.urlopen(url, timeout=240, context=_SSL) as resp:
            data = resp.read()
        zip_path.write_bytes(data)
    except Exception as exc:  # noqa: BLE001 - fall back to cached copy
        if not zip_path.exists():
            raise
        print(f"WARNING: live fetch failed ({exc}); using cached {zip_path.name}")

    with zipfile.ZipFile(zip_path) as zf:
        csv_name = next(n for n in zf.namelist() if n.endswith(".csv") and "MetaData" not in n)
        raw = zf.read(csv_name).decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(raw)))


def latest_year(rows: list[dict]) -> str:
    return max(r["REF_DATE"] for r in rows if r["REF_DATE"])


def revenue_by_year(rows: list[dict], geo: str, table_id: str, product_id: str, url: str) -> dict[str, dict]:
    """Return {year: {fiscalYear, total, taxes, grants, other, source}} for one GEO.

    `other` lumps everything that is not tax or grant revenue (social
    contributions, interest, sales, etc.).
    """
    want = {REV_TOTAL: "total", REV_TAXES: "taxes", REV_GRANTS: "grants"}
    acc: dict[str, dict] = defaultdict(lambda: {"total": 0.0, "taxes": 0.0, "grants": 0.0})
    for r in rows:
        if r["GEO"] != geo:
            continue
        if r.get("Display value") and r["Display value"] != REV_DISPLAY:
            continue
        key = want.get(r[REV_DIM])
        if key is None:
            continue
        val = r["VALUE"].strip()
        if not val:
            continue
        acc[r["REF_DATE"]][key] += float(val) * 1_000_000

    retrieved = date.today().isoformat()
    out: dict[str, dict] = {}
    for yr, a in acc.items():
        if a["total"] <= 0:
            continue
        other = max(a["total"] - a["taxes"] - a["grants"], 0.0)
        out[yr] = {
            "fiscalYear": yr,
            "total": round(a["total"]),
            "taxes": round(a["taxes"]),
            "grants": round(a["grants"]),
            "other": round(other),
            "source": {"table": table_id, "productId": product_id, "url": url, "retrievedAt": retrieved},
        }
    return out


def build_revenue(fed_rows: list[dict], pt_rows: list[dict]) -> dict[str, dict]:
    """Return {code: {year: revenueBlock}} for every jurisdiction we can resolve."""
    out: dict[str, dict] = {}
    for code, (name, geo, component) in JURISDICTIONS.items():
        if code == "ca" and fed_rows:
            by_year = revenue_by_year(fed_rows, "Canada", CGFS_FED[1], CGFS_FED[0], CGFS_FED[2])
        elif code != "ca" and pt_rows:
            by_year = revenue_by_year(pt_rows, geo, CGFS_PT[1], CGFS_PT[0], CGFS_PT[2])
        else:
            by_year = {}
        if by_year:
            out[code] = by_year
    return out


def functions_from(divisions: dict[str, dict], children: dict[str, dict[str, float]]) -> tuple[float, list]:
    """Turn one year's accumulated divisions/children into (total, functions[])."""
    total = sum(d["amount"] for d in divisions.values())
    functions = []
    for ccode, d in sorted(divisions.items(), key=lambda kv: kv[1]["amount"], reverse=True):
        entry = {"name": d["name"], "amount": round(d["amount"]), "share": round(d["amount"] / total, 5)}
        kids = children.get(ccode)
        if kids:
            parent_amt = d["amount"]
            entry["children"] = [
                {
                    "name": n,
                    "amount": round(a),
                    "share": round(a / total, 5),
                    "shareOfParent": round(a / parent_amt, 5) if parent_amt else 0,
                }
                for n, a in sorted(kids.items(), key=lambda kv: kv[1], reverse=True)
            ]
        functions.append(entry)
    return total, functions


def build() -> None:
    rows = fetch_table(PRODUCT_ID, "ccofog.zip")
    latest = latest_year(rows)
    print(f"Latest year in CCOFOG table: {latest}")

    # Revenue tables (best-effort; the app degrades gracefully if absent).
    try:
        fed_rows = fetch_table(CGFS_FED[0], "cgfs_fed.zip")
    except Exception as exc:  # noqa: BLE001
        print(f"WARNING: federal revenue table unavailable ({exc})")
        fed_rows = []
    try:
        pt_rows = fetch_table(CGFS_PT[0], "cgfs_pt.zip")
    except Exception as exc:  # noqa: BLE001
        print(f"WARNING: provincial revenue table unavailable ({exc})")
        pt_rows = []
    revenue = build_revenue(fed_rows, pt_rows)
    print(f"Revenue resolved for {len(revenue)}/{len(JURISDICTIONS)} jurisdictions")

    retrieved = date.today().isoformat()
    source = {"table": TABLE_ID, "productId": PRODUCT_ID, "url": TABLE_URL, "retrievedAt": retrieved}

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    index = []
    all_years: set[str] = set()

    for code, (name, geo, component) in JURISDICTIONS.items():
        # year -> (divisions, children)
        acc: dict[str, tuple[dict, dict]] = defaultdict(lambda: ({}, {}))
        for r in rows:
            if r["GEO"] != geo or r["Public sector components"] != component:
                continue
            parsed = cofog(r["Canadian Classification of Functions of Government (CCOFOG)"])
            if parsed is None:
                continue
            ccode, cname = parsed
            val = r["VALUE"].strip()
            if not val:
                continue
            amount = float(val) * 1_000_000  # table is in millions
            divisions, children = acc[r["REF_DATE"]]
            if len(ccode) == 3:
                d = divisions.setdefault(ccode, {"name": cname, "amount": 0.0})
                d["amount"] += amount
            elif len(ccode) == 4:
                children.setdefault(ccode[:3], {})
                children[ccode[:3]][cname] = children[ccode[:3]].get(cname, 0.0) + amount

        years_out: dict[str, dict] = {}
        for yr, (divisions, children) in acc.items():
            if not divisions:
                continue
            total, functions = functions_from(divisions, children)
            yd = {"totalExpenditure": round(total), "functions": functions}
            rev = revenue.get(code, {}).get(yr)
            if rev:
                yd["revenue"] = rev
            years_out[yr] = yd

        if not years_out:
            print(f"WARNING: no data for {code} ({name}) — skipping")
            continue

        available = sorted(years_out)
        all_years.update(available)
        j_latest = available[-1]
        payload = {
            "code": code,
            "name": name,
            "kind": KIND[code],
            "component": component,
            "latestYear": j_latest,
            "availableYears": available,
            "years": years_out,
            "source": source,
        }
        (OUT_DIR / f"{code}.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
        latest_total = years_out[j_latest]["totalExpenditure"]
        index.append({"code": code, "name": name, "kind": KIND[code], "totalExpenditure": latest_total})
        n_kids = sum(len(f.get("children", [])) for f in years_out[j_latest]["functions"])
        print(
            f"  {code:3} {name:32} years={available[0]}–{available[-1]} ({len(available)})  "
            f"latest=${latest_total/1e9:7.1f}B  sub={n_kids}"
        )

    index_years = sorted(all_years)
    (OUT_DIR / "index.json").write_text(
        json.dumps(
            {
                "latestYear": index_years[-1] if index_years else latest,
                "availableYears": index_years,
                "source": source,
                "jurisdictions": index,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\nWrote {len(index)} jurisdiction files + index.json to {OUT_DIR}")
    print(f"Year range: {index_years[0]}–{index_years[-1]} ({len(index_years)} years)")


if __name__ == "__main__":
    try:
        build()
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
