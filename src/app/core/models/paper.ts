export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  publisher: string | null;
  journal: string | null;
  abstract: string | null;
  doi: string | null;
  downloadUrl: string | null;
  language: string | null;
  documentType: string | null;
  citationCount: number | null;
  hasFullText: boolean;
  fieldOfStudy: string | null;
}

export interface AggregateBucket {
  label: string;
  count: number;
}

export interface Aggregates {
  years: AggregateBucket[];
  publishers: AggregateBucket[];
  languages: AggregateBucket[];
  documentTypes: AggregateBucket[];
  authors: AggregateBucket[];
  topics: AggregateBucket[];
}

export type DataSource = 'core' | 'sample';
export type AggregateSource = 'core' | 'loaded' | 'sample';

export interface Facet {
  kind: 'year' | 'publisher' | 'documentType' | 'language' | 'author' | 'topic';
  value: string;
}

export interface SearchNotice {
  tone: 'sample' | 'warning';
  title: string;
  message: string;
}

export interface SearchSuccess {
  ok: true;
  papers: Paper[];
  totalHits: number;
}

export interface SearchFailure {
  ok: false;
  code: 'rate_limited' | 'unauthorized' | 'upstream' | 'network';
  message: string;
  status: number | null;
}

export type SearchOutcome = SearchSuccess | SearchFailure;

export interface AggregateSuccess {
  ok: true;
  aggregates: Aggregates;
}

export interface AggregateFailure {
  ok: false;
  message: string;
}

export type AggregateOutcome = AggregateSuccess | AggregateFailure;
