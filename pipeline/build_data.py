#!/usr/bin/env python3
"""
Build normalized tax-allocation data for "How Canada Spends".

Source: Statistics Canada table 10-10-0024-01
  "Canadian Classification of Functions of Government (CCOFOG),
   by general government component"
  https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1010002401

We pull the full table via the free StatCan Web Data Service (WDS)
`getFullTableDownloadCSV` endpoint, then emit one JSON file per
jurisdiction plus an index and a sources manifest.

For each jurisdiction we take the government's OWN spending by function:
  - Federal    -> GEO "Canada",  component "Federal government"
  - Provinces  -> GEO <province>, component "Provincial and territorial governments"
  - Territories-> GEO <territory>,component "Provincial and territorial governments"

Only the 10 top-level COFOG divisions (3-digit codes 701-710) are kept,
so category amounts sum to the total without double-counting sub-functions.
"""

from __future__ import annotations

import csv
import io
import json
import sys
import urllib.request
import zipfile
from datetime import date
from pathlib import Path

PRODUCT_ID = "10100024"
TABLE_ID = "10-10-0024-01"
TABLE_URL = "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1010002401"
WDS_CSV = f"https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/{PRODUCT_ID}/en"

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "web" / "public" / "data"

PROV_COMPONENT = "Provincial and territorial governments"
FED_COMPONENT = "Federal government"

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


def top_level_function(label: str) -> str | None:
    """Return a clean function name if `label` is a 3-digit COFOG division, else None.

    Labels look like 'Health [707]' or 'Executive and legislative organs ... [7011]'.
    """
    if "[" not in label or not label.rstrip().endswith("]"):
        return None
    code = label.rsplit("[", 1)[1].rstrip("]")
    if code.isdigit() and len(code) == 3:
        return label.rsplit("[", 1)[0].strip()
    return None


def fetch_csv_rows() -> list[dict]:
    """Fetch the WDS download link, download the zip, and return parsed CSV rows.

    Falls back to a previously downloaded zip in data/raw if the network fails.
    """
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = RAW_DIR / "ccofog.zip"
    try:
        with urllib.request.urlopen(WDS_CSV, timeout=60) as resp:
            meta = json.load(resp)
        if meta.get("status") != "SUCCESS":
            raise RuntimeError(f"WDS returned status {meta.get('status')}")
        url = meta["object"]
        print(f"Downloading {url}")
        with urllib.request.urlopen(url, timeout=120) as resp:
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


def build() -> None:
    rows = fetch_csv_rows()
    year = latest_year(rows)
    print(f"Latest year in table: {year}")

    retrieved = date.today().isoformat()
    source = {"table": TABLE_ID, "productId": PRODUCT_ID, "url": TABLE_URL, "retrievedAt": retrieved}

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    index = []

    for code, (name, geo, component) in JURISDICTIONS.items():
        funcs: dict[str, float] = {}
        for r in rows:
            if r["REF_DATE"] != year or r["GEO"] != geo:
                continue
            if r["Public sector components"] != component:
                continue
            fname = top_level_function(r["Canadian Classification of Functions of Government (CCOFOG)"])
            if fname is None:
                continue
            val = r["VALUE"].strip()
            if not val:
                continue
            # Table is in millions of dollars; convert to dollars.
            funcs[fname] = funcs.get(fname, 0.0) + float(val) * 1_000_000

        if not funcs:
            print(f"WARNING: no data for {code} ({name}) — skipping")
            continue

        total = sum(funcs.values())
        functions = [
            {"name": n, "amount": round(a), "share": round(a / total, 5)}
            for n, a in sorted(funcs.items(), key=lambda kv: kv[1], reverse=True)
        ]

        payload = {
            "code": code,
            "name": name,
            "kind": KIND[code],
            "fiscalYear": year,
            "component": component,
            "totalExpenditure": round(total),
            "functions": functions,
            "source": source,
        }
        (OUT_DIR / f"{code}.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
        index.append({"code": code, "name": name, "kind": KIND[code], "totalExpenditure": round(total)})
        print(f"  {code:3} {name:32} total=${total/1e9:8.1f}B  functions={len(functions)}")

    (OUT_DIR / "index.json").write_text(
        json.dumps({"fiscalYear": year, "source": source, "jurisdictions": index}, indent=2),
        encoding="utf-8",
    )
    print(f"\nWrote {len(index)} jurisdiction files + index.json to {OUT_DIR}")


if __name__ == "__main__":
    try:
        build()
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
