import { Injectable, computed, inject, signal } from '@angular/core';
import { ParamMap, Router, NavigationEnd } from '@angular/router';

import { aggregatePapers } from '../api/normalize';
import { filterSample } from '../data/sample-papers';
import { downloadText, papersToBibtex, papersToCsv, papersToJson } from '../export/export-papers';
import { composeQuery } from '../query/compose-query';
import { insertClause, matchesPaper, parseQuery, positiveTerms } from '../query/boolean-query';
import { SortKey, sortPapers } from '../query/sort-papers';
import { LibraryService } from './library.service';
import { ToastService } from './toast.service';
import {
  AggregateSource,
  Aggregates,
  DataSource,
  Facet,
  Paper,
  SearchNotice,
} from '../models/paper';
import { CoreApiService } from './core-api.service';

@Injectable({ providedIn: 'root' })
export class SearchStore {
  private readonly api = inject(CoreApiService);
  private readonly router = inject(Router);
  private readonly library = inject(LibraryService);
  private readonly toast = inject(ToastService);
  private readonly timer: { id: ReturnType<typeof setTimeout> | null } = { id: null };
  private requestId = 0;
  private lastUrl = '';
  private writingUrl = false;

  readonly draft = signal('');
  readonly query = signal('');
  readonly refine = signal('');
  readonly limit = signal(20);
  readonly page = signal(1);
  readonly papers = signal<Paper[]>([]);
  readonly totalHits = signal(0);
  readonly loading = signal(false);
  readonly searched = signal(false);
  readonly source = signal<DataSource | null>(null);
  readonly aggregateSource = signal<AggregateSource | null>(null);
  readonly aggregates = signal<Aggregates | null>(null);
  readonly notice = signal<SearchNotice | null>(null);
  readonly paging = signal<'pages' | 'more'>('pages');
  readonly facet = signal<Facet | null>(null);
  readonly sort = signal<SortKey>('relevance');
  readonly yearFrom = signal<number | null>(null);
  readonly yearTo = signal<number | null>(null);
  readonly selectedId = signal<string | null>(null);

  readonly offset = computed(() => (this.page() - 1) * this.limit());
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.totalHits() / this.limit())));
  readonly validation = computed(() => parseQuery(this.draft()));
  readonly refineValidation = computed(() => parseQuery(this.refine()));
  readonly terms = computed(() => {
    const main = positiveTerms(parseQuery(this.query()).ast);
    const extra = positiveTerms(this.refineValidation().ast);
    return [...new Set([...main, ...extra])];
  });
  readonly visiblePapers = computed(() => {
    const parsed = this.refineValidation();
    const papers = this.papers();
    const ast = parsed.ast;
    if (!this.refine().trim() || !parsed.valid || !ast) {
      return papers;
    }
    return papers.filter((paper) => matchesPaper(paper, ast));
  });
  readonly selected = computed(() => {
    const id = this.selectedId();
    if (!id) {
      return null;
    }
    return this.papers().find((paper) => paper.id === id) ?? this.library.bookmarks().find((paper) => paper.id === id) ?? null;
  });
  readonly insights = computed(() => {
    const years = (this.aggregates()?.years ?? [])
      .map((bucket) => Number(bucket.label))
      .filter((year) => Number.isFinite(year));
    const top = this.aggregates()?.publishers[0];
    return {
      total: this.totalHits(),
      span: years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—',
      publisher: top ? `${top.label}` : '—',
      publisherCount: top?.count ?? 0,
    };
  });
  readonly rangeLabel = computed(() => {
    if (!this.papers().length) {
      return '';
    }
    const start = this.paging() === 'more' ? 1 : this.offset() + 1;
    const end = this.paging() === 'more' ? this.papers().length : this.offset() + this.papers().length;
    return `Showing ${start}–${end} of ${this.totalHits()}`;
  });

  constructor() {
    this.applyParams(this.router.routerState.snapshot.root.queryParamMap);
    if (this.query().trim()) {
      void this.search();
    }
    this.router.events.subscribe((event) => {
      if (!(event instanceof NavigationEnd) || this.writingUrl) {
        return;
      }
      const incoming = JSON.stringify(normalizeParams(this.router.routerState.snapshot.root.queryParamMap));
      if (incoming === this.lastUrl) {
        return;
      }
      this.applyParams(this.router.routerState.snapshot.root.queryParamMap);
      void this.search();
    });
  }

  setDraft(value: string): void {
    this.draft.set(value);
    if (this.timer.id) {
      clearTimeout(this.timer.id);
    }
    this.timer.id = setTimeout(() => {
      this.commit(value);
    }, 350);
  }

  commitNow(): void {
    if (this.timer.id) {
      clearTimeout(this.timer.id);
      this.timer.id = null;
    }
    this.commit(this.draft());
  }

  replaceQuery(value: string): void {
    this.draft.set(value);
    this.commitNow();
  }

  setRefine(value: string): void {
    this.refine.set(value);
    this.writeUrl();
  }

  setSort(sort: SortKey): void {
    if (sort === this.sort()) {
      return;
    }
    this.sort.set(sort);
    this.page.set(1);
    if (this.query().trim()) {
      void this.search();
    }
  }

  setYear(bound: 'from' | 'to', raw: string): void {
    const next = raw.trim() ? Number(raw) : null;
    const year = next !== null && Number.isFinite(next) ? Math.round(next) : null;
    if (bound === 'from') {
      this.yearFrom.set(year);
    } else {
      this.yearTo.set(year);
    }
    this.page.set(1);
    if (this.query().trim()) {
      void this.search();
    } else {
      this.writeUrl();
    }
  }

  openPaper(id: string): void {
    this.selectedId.set(id);
  }

  closePaper(): void {
    this.selectedId.set(null);
  }

  restore(search: { query: string; limit: number; sort: SortKey; yearFrom: number | null; yearTo: number | null }): void {
    this.draft.set(search.query);
    this.query.set(search.query.trim());
    this.limit.set(clampLimit(search.limit));
    this.sort.set(search.sort);
    this.yearFrom.set(search.yearFrom);
    this.yearTo.set(search.yearTo);
    this.page.set(1);
    this.facet.set(null);
    void this.search();
  }

  saveSearch(): void {
    const query = this.query().trim();
    if (!query) {
      this.toast.show('Run a search before saving it.');
      return;
    }
    this.library.saveSearch({
      query,
      limit: this.limit(),
      sort: this.sort(),
      yearFrom: this.yearFrom(),
      yearTo: this.yearTo(),
    });
    this.toast.show('Search saved on this device.');
  }

  export(kind: 'csv' | 'json' | 'bib'): void {
    const papers = this.visiblePapers();
    if (!papers.length) {
      this.toast.show('Nothing on this page to export.');
      return;
    }
    if (kind === 'csv') {
      downloadText('paperlens.csv', papersToCsv(papers), 'text/csv;charset=utf-8');
    } else if (kind === 'json') {
      downloadText('paperlens.json', papersToJson(papers), 'application/json');
    } else {
      downloadText('paperlens.bib', papersToBibtex(papers), 'application/x-bibtex');
    }
    this.toast.show(`Exported ${papers.length} papers.`);
  }

  async share(): Promise<void> {
    this.writeUrl();
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(this.params())) {
      if (value) {
        params.set(key, value);
      }
    }
    url.search = params.toString();
    try {
      await navigator.clipboard.writeText(url.toString());
      this.toast.show('Link copied.');
    } catch {
      this.toast.show('Copy the address bar to share this search.');
    }
  }

  insert(clause: string): void {
    this.replaceQuery(insertClause(this.draft(), clause));
  }

  setLimit(value: number): void {
    const next = clampLimit(value);
    if (next === this.limit()) {
      return;
    }
    this.limit.set(next);
    this.page.set(1);
    if (this.query().trim()) {
      void this.search();
    }
  }

  setPage(page: number): void {
    const next = Math.min(this.pageCount(), Math.max(1, Math.round(page) || 1));
    if (next === this.page()) {
      return;
    }
    this.paging.set('pages');
    this.page.set(next);
    void this.search();
  }

  setPaging(mode: 'pages' | 'more'): void {
    if (mode === this.paging()) {
      return;
    }
    this.paging.set(mode);
    this.page.set(1);
    if (this.query().trim()) {
      void this.search();
    }
  }

  loadMore(): void {
    if (this.loading() || !this.searched() || this.page() >= this.pageCount()) {
      return;
    }
    this.paging.set('more');
    this.page.update((page) => page + 1);
    void this.search({ append: true });
  }

  private commit(value: string): void {
    const trimmed = value.trim();
    if (!parseQuery(trimmed).valid) {
      return;
    }
    if (trimmed === this.query()) {
      return;
    }
    this.query.set(trimmed);
    this.facet.set(null);
    this.page.set(1);
    void this.search();
  }

  toggleFacet(facet: Facet): void {
    const current = this.facet();
    const same = current?.kind === facet.kind && current.value === facet.value;
    this.facet.set(same ? null : facet);
    this.page.set(1);
    if (this.query().trim()) {
      void this.search();
    }
  }

  async search(options?: { append?: boolean }): Promise<void> {
    const append = options?.append === true;
    const query = this.query().trim();
    const id = ++this.requestId;
    if (!query) {
      this.searched.set(false);
      this.loading.set(false);
      this.papers.set([]);
      this.totalHits.set(0);
      this.aggregates.set(null);
      this.source.set(null);
      this.aggregateSource.set(null);
      this.notice.set(null);
      this.writeUrl();
      return;
    }

    this.loading.set(true);
    this.searched.set(true);
    const requested = composeQuery(query, this.facet(), this.yearFrom(), this.yearTo());
    const page = await this.api.search(requested, this.limit(), this.offset(), this.sortParam());
    const aggregate = append ? null : await this.api.aggregate(requested);
    if (id !== this.requestId) {
      return;
    }

    if (!page.ok) {
      this.useSample(requested, page.message, append);
      this.library.remember(query);
      this.writeUrl();
      this.loading.set(false);
      return;
    }

    const ordered = this.sort() === 'relevance' ? page.papers : sortPapers(page.papers, this.sort());
    this.papers.set(append ? [...this.papers(), ...ordered] : ordered);
    this.totalHits.set(page.totalHits);
    this.source.set('core');
    this.notice.set(null);
    if (aggregate?.ok && hasBuckets(aggregate.aggregates)) {
      this.aggregates.set(aggregate.aggregates);
      this.aggregateSource.set('core');
    } else if (!append) {
      this.aggregates.set(aggregatePapers(page.papers));
      this.aggregateSource.set('loaded');
    } else if (this.aggregateSource() === 'loaded') {
      this.aggregates.set(aggregatePapers(this.papers()));
    }
    this.library.remember(query);
    this.writeUrl();
    this.loading.set(false);
  }

  private useSample(query: string, message: string, append: boolean): void {
    const matched = sortPapers(filterSample(query), this.sort());
    const start = this.offset();
    const slice = matched.slice(start, start + this.limit());
    this.papers.set(append ? [...this.papers(), ...slice] : slice);
    this.totalHits.set(matched.length);
    this.source.set('sample');
    this.aggregates.set(aggregatePapers(matched));
    this.aggregateSource.set('sample');
    this.notice.set({
      tone: 'sample',
      title: 'Showing sample data',
      message: `${message} The list below is the built-in sample set, filtered to this query, so the screen still works.`,
    });
  }

  private sortParam(): string | null {
    if (this.sort() === 'year_asc') {
      return 'yearPublished:asc';
    }
    if (this.sort() === 'year_desc') {
      return 'yearPublished:desc';
    }
    return null;
  }

  private params(): Record<string, string | null> {
    const facet = this.facet();
    return {
      q: this.query() || null,
      limit: this.limit() === 20 ? null : String(this.limit()),
      page: this.page() > 1 ? String(this.page()) : null,
      sort: this.sort() === 'relevance' ? null : this.sort(),
      from: this.yearFrom() === null ? null : String(this.yearFrom()),
      to: this.yearTo() === null ? null : String(this.yearTo()),
      refine: this.refine() || null,
      facet: facet ? `${facet.kind}:${facet.value}` : null,
      paging: this.paging() === 'more' ? 'more' : null,
    };
  }

  private applyParams(map: ParamMap): void {
    const query = map.get('q') ?? '';
    this.draft.set(query);
    this.query.set(query.trim());
    this.refine.set(map.get('refine') ?? '');
    const limit = Number(map.get('limit'));
    this.limit.set(clampLimit(Number.isFinite(limit) && limit > 0 ? limit : 20));
    const page = Number(map.get('page'));
    this.page.set(Number.isFinite(page) && page > 0 ? Math.round(page) : 1);
    const sort = map.get('sort');
    this.sort.set(sort === 'year_asc' || sort === 'year_desc' ? sort : 'relevance');
    this.yearFrom.set(yearParam(map.get('from')));
    this.yearTo.set(yearParam(map.get('to')));
    this.paging.set(map.get('paging') === 'more' ? 'more' : 'pages');
    this.facet.set(parseFacet(map.get('facet')));
    this.lastUrl = JSON.stringify(this.params());
  }

  private writeUrl(): void {
    const queryParams = this.params();
    const serialized = JSON.stringify(queryParams);
    if (serialized === this.lastUrl) {
      return;
    }
    this.lastUrl = serialized;
    this.writingUrl = true;
    void this.router.navigate([], { queryParams, replaceUrl: true }).finally(() => {
      this.writingUrl = false;
    });
  }
}

function normalizeParams(map: ParamMap): Record<string, string | null> {
  const limitValue = Number(map.get('limit'));
  const limit = clampLimit(Number.isFinite(limitValue) && limitValue > 0 ? limitValue : 20);
  const pageValue = Number(map.get('page'));
  const page = Number.isFinite(pageValue) && pageValue > 0 ? Math.round(pageValue) : 1;
  const sort = map.get('sort') === 'year_asc' || map.get('sort') === 'year_desc' ? map.get('sort') : null;
  const from = yearParam(map.get('from'));
  const to = yearParam(map.get('to'));
  const facet = parseFacet(map.get('facet'));
  return {
    q: (map.get('q') ?? '').trim() || null,
    limit: limit === 20 ? null : String(limit),
    page: page > 1 ? String(page) : null,
    sort,
    from: from === null ? null : String(from),
    to: to === null ? null : String(to),
    refine: map.get('refine') || null,
    facet: facet ? `${facet.kind}:${facet.value}` : null,
    paging: map.get('paging') === 'more' ? 'more' : null,
  };
}

function yearParam(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const year = Number(value);
  return Number.isFinite(year) ? Math.round(year) : null;
}

function parseFacet(value: string | null): Facet | null {
  if (!value) {
    return null;
  }
  const index = value.indexOf(':');
  if (index < 0) {
    return null;
  }
  const kind = value.slice(0, index);
  const facetValue = value.slice(index + 1);
  if (kind === 'year' || kind === 'publisher' || kind === 'documentType' || kind === 'language' || kind === 'author' || kind === 'topic') {
    return { kind, value: facetValue };
  }
  return null;
}

function clampLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return 20;
  }
  return Math.min(100, Math.max(10, Math.round(value)));
}

function hasBuckets(aggregates: Aggregates): boolean {
  return (
    aggregates.years.length +
      aggregates.publishers.length +
      aggregates.languages.length +
      aggregates.documentTypes.length +
      aggregates.topics.length >
    0
  );
}
