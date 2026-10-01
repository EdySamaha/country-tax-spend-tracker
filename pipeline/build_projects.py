#!/usr/bin/env python3
"""
Build the federal "named projects" layer for "How Canada Spends".

Source: Proactive Disclosure - Grants and Contributions (Open Government)
  dataset 432527ab-7aac-45b5-81d6-7597107a7013
  consolidated bulk CSV "grants.csv" (~2.3 GB)

Honest limits (surfaced in the UI, not hidden):
  * This is FEDERAL ONLY. Provinces do not publish a uniform named-agreement feed.
  * `agreement_value` is the TOTAL (lifetime) value of each agreement, not annual
    spend, and not tied to a fiscal year's cash outlay. We therefore report it as
    "total agreement value", not as "spent this year".
  * There is NO CCOFOG / function mapping in this data, so federal projects are a
    SEPARATE explorer layer, never forced under a spending category.
  * Agreements are amended over time (same ref_number, rising amendment_number).
    We keep only the latest amendment of each agreement before aggregating.

Because the CSV is large and the connection is flaky, the download is streamed to
`data/raw/grants.csv` and RESUMED (HTTP Range) if interrupted. Parsing is streamed
row-by-row so we never hold the whole file in memory. The emitted
`web/public/data/projects_ca.json` is tiny (top programs + top recipients).

If this file is absent the web app simply shows an honest note instead of the
federal projects panel — nothing else breaks.
"""

from __future__ import annotations

import csv
import json
import ssl
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

RESOURCE_ID = "1d15a62f-5656-49ad-8c88-f40ce689d831"
CSV_URL = (
    "https://open.canada.ca/data/dataset/432527ab-7aac-45b5-81d6-7597107a7013/"
    "resource/1d15a62f-5656-49ad-8c88-f40ce689d831/download/grants.csv"
)
DATASET_URL = "https://open.canada.ca/data/en/dataset/432527ab-7aac-45b5-81d6-7597107a7013"

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "web" / "public" / "data"
CSV_PATH = RAW_DIR / "grants.csv"

TOP_PROGRAMS = 50
TOP_RECIPIENTS = 100
MIN_FY_RECORDS = 500  # skip a nearly-empty most-recent partial year

_SSL = ssl.create_default_context()


def download_resumable(url: str, dest: Path, chunk: int = 1 << 20) -> None:
    """Stream `url` to `dest`, resuming with an HTTP Range request if partial."""
    import urllib.request

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    # Discover the full size first.
    head = urllib.request.Request(url, method="HEAD")
    with urllib.request.urlopen(head, timeout=90, context=_SSL) as resp:
        total = int(resp.headers.get("Content-Length", "0"))
    have = dest.stat().st_size if dest.exists() else 0
    if total and have >= total:
        print(f"grants.csv already complete ({have:,} bytes)")
        return

    attempt = 0
    while True:
        have = dest.stat().st_size if dest.exists() else 0
        if total and have >= total:
            break
        attempt += 1
        req = urllib.request.Request(url)
        if have:
            req.add_header("Range", f"bytes={have}-")
        try:
            with urllib.request.urlopen(req, timeout=240, context=_SSL) as resp, open(dest, "ab") as f:
                print(f"[attempt {attempt}] resuming at {have:,} / {total:,} bytes")
                while True:
                    buf = resp.read(chunk)
                    if not buf:
                        break
                    f.write(buf)
        except Exception as exc:  # noqa: BLE001 - loop retries from the new offset
            new = dest.stat().st_size if dest.exists() else 0
            print(f"  interrupted ({exc}); got {new - have:,} more bytes")
            if new == have:  # no progress this round
                if attempt >= 8:
                    raise
    print(f"grants.csv download complete ({dest.stat().st_size:,} bytes)")


def fiscal_year(start_date: str) -> str | None:
    """Canadian FY from an agreement start date 'YYYY-MM-DD' (FY starts Apr 1)."""
    if not start_date or len(start_date) < 7:
        return None
    try:
        y, m = int(start_date[:4]), int(start_date[5:7])
    except ValueError:
        return None
    fy = y if m >= 4 else y - 1
    return f"{fy}-{str(fy + 1)[2:]}"


def to_amount(raw: str) -> float | None:
    if not raw:
        return None
    s = raw.strip().replace("$", "").replace(",", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def build() -> None:
    download_resumable(CSV_URL, CSV_PATH)

    # Pass 1: dedup to the latest amendment of each agreement, keyed by ref_number,
    # and bucket each agreement's (fy, program, recipient, value) once.
    # ref_number -> (amendment_number, fy, prog, recipient, dept, value)
    latest: dict[str, tuple] = {}
    rows_read = 0
    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows_read += 1
            if rows_read % 250_000 == 0:
                print(f"  parsed {rows_read:,} rows; {len(latest):,} unique agreements")
            val = to_amount(r.get("agreement_value", ""))
            if val is None or val <= 0:
                continue
            ref = (r.get("ref_number") or "").strip()
            try:
                amd = int((r.get("amendment_number") or "0").strip() or "0")
            except ValueError:
                amd = 0
            fy = fiscal_year(r.get("agreement_start_date", ""))
            prog = (r.get("prog_name_en") or "").strip() or "(unspecified program)"
            recip = (
                (r.get("recipient_legal_name") or "").strip()
                or (r.get("recipient_operating_name") or "").strip()
                or "(unnamed recipient)"
            )
            dept = (r.get("owner_org_title") or "").strip()
            key = ref or f"__noref__{rows_read}"
            prev = latest.get(key)
            if prev is None or amd >= prev[0]:
                latest[key] = (amd, fy, prog, recip, dept, val)

    print(f"Total rows: {rows_read:,}; unique agreements: {len(latest):,}")

    # Pick the latest fiscal year that has enough agreements to be representative.
    fy_counts: dict[str, int] = defaultdict(int)
    for _amd, fy, *_ in latest.values():
        if fy:
            fy_counts[fy] += 1
    eligible = sorted(fy for fy, n in fy_counts.items() if n >= MIN_FY_RECORDS)
    if not eligible:
        print("WARNING: no fiscal year meets the record threshold; aborting projects build")
        return
    target_fy = eligible[-1]
    print(f"Target fiscal year: {target_fy} ({fy_counts[target_fy]:,} agreements)")

    prog_amt: dict[str, float] = defaultdict(float)
    prog_cnt: dict[str, int] = defaultdict(int)
    prog_dept: dict[str, str] = {}
    recip_amt: dict[str, float] = defaultdict(float)
    recip_cnt: dict[str, int] = defaultdict(int)
    total = 0.0
    count = 0
    for _amd, fy, prog, recip, dept, val in latest.values():
        if fy != target_fy:
            continue
        total += val
        count += 1
        prog_amt[prog] += val
        prog_cnt[prog] += 1
        if dept and prog not in prog_dept:
            prog_dept[prog] = dept
        recip_amt[recip] += val
        recip_cnt[recip] += 1

    def top(amt: dict[str, float], cnt: dict[str, int], n: int, depts: dict | None = None):
        items = sorted(amt.items(), key=lambda kv: kv[1], reverse=True)[:n]
        out = []
        for name, a in items:
            rec = {"name": name, "amount": round(a), "count": cnt[name]}
            if depts and name in depts:
                rec["department"] = depts[name]
            out.append(rec)
        return out

    payload = {
        "fiscalYear": target_fy,
        "total": round(total),
        "count": count,
        "note": (
            "Total value of federal grant & contribution agreements that began in "
            f"{target_fy}. Values are lifetime agreement commitments, not single-year "
            "cash spending, and are not mapped to spending functions."
        ),
        "topPrograms": top(prog_amt, prog_cnt, TOP_PROGRAMS, prog_dept),
        "topRecipients": top(recip_amt, recip_cnt, TOP_RECIPIENTS),
        "source": {
            "table": "Proactive Disclosure - Grants and Contributions",
            "productId": RESOURCE_ID,
            "url": DATASET_URL,
            "retrievedAt": date.today().isoformat(),
        },
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "projects_ca.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        f"Wrote projects_ca.json: FY {target_fy}, {count:,} agreements, "
        f"${total/1e9:.1f}B, top {len(payload['topPrograms'])} programs / "
        f"{len(payload['topRecipients'])} recipients"
    )


if __name__ == "__main__":
    try:
        build()
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
