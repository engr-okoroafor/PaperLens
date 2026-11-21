import { Injectable, computed, inject, signal } from '@angular/core';

import { aggregatePapers } from '../api/normalize';
import { filterSample } from '../data/sample-papers';
import { insertClause, matchesPaper, parseQuery } from '../query/boolean-query';
import {
  AggregateSource,
  Aggregates,
  DataSource,
  Paper,
  SearchNotice,
} from '../models/paper';
import { CoreApiService } from './core-api.service';

@Injectable({ providedIn: 'root' })
export class SearchStore {
  private readonly api = inject(CoreApiService);
  private readonly timer: { id: ReturnType<typeof setTimeout> | null } = { id: null };
  private requestId = 0;

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

  readonly offset = computed(() => (this.page() - 1) * this.limit());
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.totalHits() / this.limit())));
  readonly validation = computed(() => parseQuery(this.draft()));
  readonly refineValidation = computed(() => parseQuery(this.refine()));
  readonly visiblePapers = computed(() => {
    const parsed = this.refineValidation();
    const papers = this.papers();
    const ast = parsed.ast;
    if (!this.refine().trim() || !parsed.valid || !ast) {
      return papers;
    }
    return papers.filter((paper) => matchesPaper(paper, ast));
  });
  readonly rangeLabel = computed(() => {
    if (!this.papers().length) {
      return '';
    }
    const start = this.paging() === 'more' ? 1 : this.offset() + 1;
    const end = this.paging() === 'more' ? this.papers().length : this.offset() + this.papers().length;
    return `Showing ${start}–${end} of ${this.totalHits()}`;
  });

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
    this.page.set(1);
    void this.search();
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
      return;
    }

    this.loading.set(true);
    this.searched.set(true);
    const page = await this.api.search(query, this.limit(), this.offset(), null);
    const aggregate = append ? null : await this.api.aggregate(query);
    if (id !== this.requestId) {
      return;
    }

    if (!page.ok) {
      this.useSample(query, page.message, append);
      this.loading.set(false);
      return;
    }

    this.papers.set(append ? [...this.papers(), ...page.papers] : page.papers);
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
    this.loading.set(false);
  }

  private useSample(query: string, message: string, append: boolean): void {
    const matched = filterSample(query);
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
