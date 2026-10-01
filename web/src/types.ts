export type Kind = "federal" | "province" | "territory";

export interface FunctionDatum {
  name: string;
  amount: number; // CAD
  share: number; // 0..1 of total expenditure
}

export interface Source {
  table: string;
  productId: string;
  url: string;
  retrievedAt: string;
}

export interface Jurisdiction {
  code: string;
  name: string;
  kind: Kind;
  fiscalYear: string;
  component: string;
  totalExpenditure: number;
  functions: FunctionDatum[];
  source: Source;
}

export interface IndexEntry {
  code: string;
  name: string;
  kind: Kind;
  totalExpenditure: number;
}

export interface IndexFile {
  fiscalYear: string;
  source: Source;
  jurisdictions: IndexEntry[];
}
