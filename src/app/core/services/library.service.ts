import { Injectable, signal } from '@angular/core';

import { Paper } from '../models/paper';
import { SortKey } from '../query/sort-papers';

export interface SavedSearch {
  id: string;
  query: string;
  limit: number;
  sort: SortKey;
  yearFrom: number | null;
  yearTo: number | null;
  savedAt: string;
}

@Injectable({ providedIn: 'root' })
export class LibraryService {
  readonly bookmarks = signal<Paper[]>(readJson('paperlens.bookmarks', []));
  readonly saved = signal<SavedSearch[]>(readJson('paperlens.saved', []));
  readonly recent = signal<string[]>(readJson('paperlens.recent', []));
  readonly readingOpen = signal(false);

  isBookmarked(id: string): boolean {
    return this.bookmarks().some((paper) => paper.id === id);
  }

  toggleBookmark(paper: Paper): boolean {
    const exists = this.isBookmarked(paper.id);
    const next = exists
      ? this.bookmarks().filter((item) => item.id !== paper.id)
      : [paper, ...this.bookmarks()];
    this.bookmarks.set(next);
    writeJson('paperlens.bookmarks', next);
    return !exists;
  }

  saveSearch(search: Omit<SavedSearch, 'id' | 'savedAt'>): void {
    const entry: SavedSearch = {
      ...search,
      id: `${Date.now()}`,
      savedAt: new Date().toISOString(),
    };
    const next = [entry, ...this.saved().filter((item) => item.query !== search.query)].slice(0, 12);
    this.saved.set(next);
    writeJson('paperlens.saved', next);
  }

  removeSaved(id: string): void {
    const next = this.saved().filter((item) => item.id !== id);
    this.saved.set(next);
    writeJson('paperlens.saved', next);
  }

  remember(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    const next = [trimmed, ...this.recent().filter((item) => item !== trimmed)].slice(0, 8);
    this.recent.set(next);
    writeJson('paperlens.recent', next);
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}
