import { AggregateBucket, Aggregates, Paper } from '../models/paper';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] != null && record[key] !== '') {
      return record[key];
    }
  }
  return undefined;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function cleanText(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) {
    return null;
  }
  // Strip JATS titles like <jats:title>Abstract</jats:title>
  let cleaned = raw.replace(/<\/?jats:title[^>]*>.*?<\/jats:title>/gi, ' ');
  // Strip JATS / XML tags such as </jats:p>, <jats:italic>, etc.
  cleaned = cleaned.replace(/<\/?jats:[^>]*>/gi, ' ');
  // Strip generic HTML / XML tags if any remain
  cleaned = cleaned.replace(/<\/?[a-z0-9]+(?::[a-z0-9]+)?(?:\s+[^>]*)?>/gi, ' ');
  // Unescape common XML/HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&thinsp;/g, '\u2009')
    .replace(/&nbsp;/g, ' ');
  // Normalize whitespace first
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  // Clean up redundant "AbstractAbstract" or "Abstract:" or "Abstract " prefixes often prepended in publisher feeds
  cleaned = cleaned.replace(/^(?:Abstract\s*[:\-\—]?\s*)+/i, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

function asNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function authorsOf(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      const record = asRecord(item);
      return record ? (asString(record['name']) ?? '') : '';
    })
    .filter((name) => name.length > 0);
}

function publisherOf(value: unknown): string | null {
  if (typeof value === 'string') {
    return asString(value);
  }
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return asString(record['name']) ?? asString(record['title']);
}

function journalOf(value: unknown): string | null {
  if (typeof value === 'string') {
    return asString(value);
  }
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const first = value[0];
  if (typeof first === 'string') {
    return asString(first);
  }
  const record = asRecord(first);
  return record ? asString(record['title']) : null;
}

function languageOf(value: unknown): string | null {
  if (typeof value === 'string') {
    return asString(value);
  }
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return asString(record['name']) ?? asString(record['code']);
}

function linkOf(value: unknown): string | null {
  if (typeof value === 'string') {
    return asString(value);
  }
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return asString(record['url']) ?? asString(record['href']);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => linkOf(item)).filter((item): item is string => item !== null);
}

export function normalizeWork(value: unknown): Paper | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  const title = asString(pick(record, 'title'));
  if (!title) {
    return null;
  }
  const downloadUrl = asString(pick(record, 'downloadUrl', 'download_url'));
  const sourceUrls = stringList(pick(record, 'sourceFulltextUrls', 'source_fulltext_urls'));
  const links = stringList(pick(record, 'links'));
  const fullText = asString(pick(record, 'fullText', 'full_text'));
  const resolvedDownload = downloadUrl ?? sourceUrls[0] ?? links[0] ?? null;
  const id = asString(pick(record, 'id')) ?? asString(pick(record, 'doi')) ?? title;
  const year = asNumber(pick(record, 'yearPublished', 'year_published'));

  return {
    id,
    title,
    authors: authorsOf(pick(record, 'authors')),
    year: year !== null && year > 1000 && year <= 2026 ? Math.round(year) : null,
    publisher: publisherOf(pick(record, 'publisher')),
    journal: journalOf(pick(record, 'journals', 'journal')),
    abstract: cleanText(pick(record, 'abstract')),
    doi: asString(pick(record, 'doi')),
    downloadUrl: resolvedDownload,
    language: languageOf(pick(record, 'language')),
    documentType: asString(pick(record, 'documentType', 'document_type')),
    citationCount: asNumber(pick(record, 'citationCount', 'citation_count')),
    hasFullText: Boolean(resolvedDownload || fullText),
    fieldOfStudy: asString(pick(record, 'fieldOfStudy', 'field_of_study')),
  };
}

export function normalizeSearchBody(payload: unknown): { papers: Paper[]; totalHits: number } {
  const record = asRecord(payload) ?? {};
  const results = pick(record, 'results', 'data', 'hits');
  const list = Array.isArray(results) ? results : [];
  const papers = list.map((item) => normalizeWork(item)).filter((paper): paper is Paper => paper !== null);
  const reported = asNumber(pick(record, 'totalHits', 'total_hits', 'total'));
  return { papers, totalHits: reported ?? papers.length };
}

function bucketsFrom(value: unknown, limit: number): AggregateBucket[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const record = asRecord(item);
        if (!record) {
          return null;
        }
        const label = asString(record['value'] ?? record['key'] ?? record['label']);
        const count = asNumber(record['count'] ?? record['doc_count']) ?? 0;
        return label ? { label, count } : null;
      })
      .filter((bucket): bucket is AggregateBucket => bucket !== null && bucket.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }
  return Object.entries(record)
    .map(([label, count]) => ({ label, count: asNumber(count) ?? 0 }))
    .filter((bucket) => bucket.label.trim() && bucket.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function normalizeAggregates(payload: unknown): Aggregates | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }
  const nested = asRecord(root['data']);
  const bag = asRecord(root['aggregations']) ?? (nested ? asRecord(nested['aggregations']) : null);
  if (!bag) {
    return null;
  }
  const currentYear = new Date().getFullYear();
  const years = bucketsFrom(pick(bag, 'yearPublished', 'year_published'), 120)
    .filter((bucket) => {
      const y = Number(bucket.label);
      return Number.isFinite(y) && y >= 1800 && y <= currentYear;
    })
    .sort((a, b) => Number(a.label) - Number(b.label));
  return {
    years,
    publishers: bucketsFrom(pick(bag, 'publisher', 'publishers'), 8),
    languages: bucketsFrom(pick(bag, 'language', 'languages'), 8),
    documentTypes: bucketsFrom(pick(bag, 'documentType', 'document_type'), 8),
    authors: bucketsFrom(pick(bag, 'authors', 'author'), 8),
    topics: bucketsFrom(pick(bag, 'fieldOfStudy', 'field_of_study'), 8),
  };
}

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'the',
  'of',
  'for',
  'to',
  'in',
  'on',
  'with',
  'from',
  'by',
  'or',
  'not',
]);

export function aggregatePapers(papers: readonly Paper[]): Aggregates {
  const tally = (values: Array<string | null | undefined>, limit: number): AggregateBucket[] => {
    const counts = new Map<string, number>();
    for (const value of values) {
      if (!value) {
        continue;
      }
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  };

  const currentYear = new Date().getFullYear();
  const years = tally(
    papers
      .map((paper) => (paper.year ? String(paper.year) : null))
      .filter((y) => {
        if (!y) return false;
        const num = Number(y);
        return Number.isFinite(num) && num >= 1800 && num <= currentYear;
      }),
    120,
  ).sort((a, b) => Number(a.label) - Number(b.label));

  const keywords = new Map<string, number>();
  for (const paper of papers) {
    const seen = new Set<string>();
    for (const raw of paper.title.toLowerCase().split(/[^a-z0-9]+/)) {
      if (raw.length < 4 || STOPWORDS.has(raw) || seen.has(raw)) {
        continue;
      }
      seen.add(raw);
      keywords.set(raw, (keywords.get(raw) ?? 0) + 1);
    }
  }
  const keywordBuckets = [...keywords.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const topics = tally(
    papers.map((paper) => paper.fieldOfStudy),
    8,
  );

  return {
    years,
    publishers: tally(
      papers.map((paper) => paper.publisher),
      8,
    ),
    languages: tally(
      papers.map((paper) => paper.language),
      8,
    ),
    documentTypes: tally(
      papers.map((paper) => paper.documentType),
      8,
    ),
    authors: tally(
      papers.flatMap((paper) => paper.authors),
      8,
    ),
    topics: topics.length > 0 ? topics : keywordBuckets,
  };
}
