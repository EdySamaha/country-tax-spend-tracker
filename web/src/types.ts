export type Kind = "federal" | "province" | "territory";

export interface FunctionDatum {
  name: string;
  amount: number; // CAD
  share: number; // 0..1 of total expenditure
  shareOfParent?: number; // 0..1 of parent function (sub-categories only)
  children?: FunctionDatum[]; // 4-digit sub-functions (federal only, where reported)
}

export interface Source {
  table: string;
  productId: string;
  url: string;
  retrievedAt: string;
}

export interface Revenue {
  fiscalYear: string;
  total: number; // CAD
  taxes: number;
  grants: number; // transfers received from other governments
  other: number; // social contributions, interest, sales, etc.
  source: Source;
}

/** One fiscal year of a jurisdiction's spending (as stored in the data file). */
export interface YearData {
  totalExpenditure: number;
  functions: FunctionDatum[];
  revenue?: Revenue;
}

/** The full multi-year record stored in each <code>.json file. */
export interface JurisdictionSeries {
  code: string;
  name: string;
  kind: Kind;
  component: string;
  latestYear: string;
  availableYears: string[];
  years: Record<string, YearData>;
  source: Source;
}

/**
 * A single year sliced out of a JurisdictionSeries — the flat shape the
 * breakdown/compare components consume. `fiscalYear` is the year actually
 * shown (which may fall back to the nearest available year).
 */
export interface Jurisdiction {
  code: string;
  name: string;
  kind: Kind;
  fiscalYear: string;
  component: string;
  totalExpenditure: number;
  functions: FunctionDatum[];
  revenue?: Revenue;
  source: Source;
}

/** A curated flagship federal program, mapped to a CCOFOG category. */
export interface ProgramDatum {
  name: string;
  category: string; // matches a top-level CCOFOG function name
  amount: number; // CAD, annual spend ("cost")
  reach: string; // who the money goes to ("popularity"/reach)
  source: { label: string; url: string };
}

export interface ProgramsFile {
  fiscalYear: string;
  basis: string;
  programs: ProgramDatum[];
}

export interface ProjectAgg {
  name: string;
  amount: number; // CAD, total agreement value
  count: number; // number of agreements
  department?: string;
}

export interface ProjectsFile {
  fiscalYear: string;
  total: number;
  count: number;
  note: string;
  topPrograms: ProjectAgg[];
  topRecipients: ProjectAgg[];
  source: Source;
}

export interface IndexEntry {
  code: string;
  name: string;
  kind: Kind;
  totalExpenditure: number;
}

export interface IndexFile {
  latestYear: string;
  availableYears: string[];
  source: Source;
  jurisdictions: IndexEntry[];
}
