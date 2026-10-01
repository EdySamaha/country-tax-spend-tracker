import type { IndexFile, Jurisdiction } from "./types";

const BASE = import.meta.env.BASE_URL; // "./" per vite.config

export async function loadIndex(): Promise<IndexFile> {
  const res = await fetch(`${BASE}data/index.json`);
  if (!res.ok) throw new Error(`Failed to load index.json (${res.status})`);
  return res.json();
}

const cache = new Map<string, Jurisdiction>();

export async function loadJurisdiction(code: string): Promise<Jurisdiction> {
  const hit = cache.get(code);
  if (hit) return hit;
  const res = await fetch(`${BASE}data/${code}.json`);
  if (!res.ok) throw new Error(`Failed to load ${code}.json (${res.status})`);
  const data: Jurisdiction = await res.json();
  cache.set(code, data);
  return data;
}

/** Compact CAD, e.g. $85.3B, $1.2T, $940M. */
export function formatCAD(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString("en-CA")}`;
}

/** Share (0..1) as a percentage string, e.g. 39.2%. */
export function formatPct(share: number, digits = 1): string {
  return `${(share * 100).toFixed(digits)}%`;
}

/** Percentage-point gap between two shares, signed. */
export function formatPP(a: number, b: number): string {
  const pp = (a - b) * 100;
  const sign = pp > 0 ? "+" : "";
  return `${sign}${pp.toFixed(1)}pp`;
}
