import type { IndexFile, Jurisdiction, JurisdictionSeries, ProgramsFile, ProjectsFile } from "./types";

const BASE = import.meta.env.BASE_URL; // "./" per vite.config

export async function loadIndex(): Promise<IndexFile> {
  const res = await fetch(`${BASE}data/index.json`);
  if (!res.ok) throw new Error(`Failed to load index.json (${res.status})`);
  return res.json();
}

const cache = new Map<string, JurisdictionSeries>();

export async function loadJurisdiction(code: string): Promise<JurisdictionSeries> {
  const hit = cache.get(code);
  if (hit) return hit;
  const res = await fetch(`${BASE}data/${code}.json`);
  if (!res.ok) throw new Error(`Failed to load ${code}.json (${res.status})`);
  const data: JurisdictionSeries = await res.json();
  cache.set(code, data);
  return data;
}

/**
 * Flatten one fiscal year out of a series. If the jurisdiction has no data for
 * the requested year, fall back to the nearest earlier year it does have (and
 * failing that, its latest) — so a global year picker never blanks a place that
 * simply reports on a different schedule.
 */
export function sliceYear(s: JurisdictionSeries, year: string): Jurisdiction {
  let fy = year;
  if (!s.years[fy]) {
    const earlier = s.availableYears.filter((y) => y <= year);
    fy = earlier.length ? earlier[earlier.length - 1] : s.latestYear;
  }
  const y = s.years[fy];
  return {
    code: s.code,
    name: s.name,
    kind: s.kind,
    component: s.component,
    fiscalYear: fy,
    totalExpenditure: y.totalExpenditure,
    functions: y.functions,
    revenue: y.revenue,
    source: s.source,
  };
}

// Federal "named projects" layer (Grants & Contributions). Optional: the file
// may not be present, in which case the UI shows an honest note instead.
let projectsCache: ProjectsFile | null | undefined;

export async function loadProjects(): Promise<ProjectsFile | null> {
  if (projectsCache !== undefined) return projectsCache;
  try {
    const res = await fetch(`${BASE}data/projects_ca.json`);
    projectsCache = res.ok ? await res.json() : null;
  } catch {
    projectsCache = null;
  }
  return projectsCache ?? null;
}

// Curated flagship federal programs (mapped to CCOFOG categories). Optional:
// absent file degrades to an honest note.
let programsCache: ProgramsFile | null | undefined;

export async function loadPrograms(): Promise<ProgramsFile | null> {
  if (programsCache !== undefined) return programsCache;
  try {
    const res = await fetch(`${BASE}data/federal_programs.json`);
    programsCache = res.ok ? await res.json() : null;
  } catch {
    programsCache = null;
  }
  return programsCache ?? null;
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
