import { Component, inject, signal } from '@angular/core';

import { LibraryService, SavedSearch } from '../../core/services/library.service';
import { SearchStore } from '../../core/services/search-store.service';
import { EXAMPLE_QUERIES, QueryToken } from '../../core/query/boolean-query';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-search-panel',
  imports: [TooltipDirective],
  templateUrl: './search-panel.html',
})
export class SearchPanel {
  readonly store = inject(SearchStore);
  readonly library = inject(LibraryService);
  readonly examples = EXAMPLE_QUERIES;
  readonly keyword = signal('');
  readonly field = signal('anywhere');

  readonly fields = [
    { id: 'anywhere', label: 'Anywhere' },
    { id: 'title', label: 'title:' },
    { id: 'authors', label: 'authors:' },
    { id: 'abstract', label: 'abstract:' },
    { id: 'publisher', label: 'publisher:' },
    { id: 'year>', label: 'yearPublished>' },
    { id: 'year<', label: 'yearPublished<' },
    { id: 'language', label: 'language:' },
    { id: 'documentType', label: 'documentType:' },
    { id: 'exists', label: '_exists_:doi' },
  ];

  onDraft(event: Event): void {
    this.store.setDraft((event.target as HTMLInputElement).value);
  }

  onRefine(event: Event): void {
    this.store.setRefine((event.target as HTMLInputElement).value);
  }

  onKeyword(event: Event): void {
    this.keyword.set((event.target as HTMLInputElement).value);
  }

  onField(event: Event): void {
    this.field.set((event.target as HTMLSelectElement).value);
  }

  submit(event: Event): void {
    event.preventDefault();
    this.store.commitNow();
  }

  syncScroll(event: Event, mirror: HTMLElement): void {
    mirror.scrollLeft = (event.target as HTMLElement).scrollLeft;
  }

  tokenClass(token: QueryToken): string {
    if (token.kind === 'op') {
      return 'tok-op';
    }
    if (token.kind === 'field' || token.kind === 'compare' || token.kind === 'exists') {
      return 'tok-field';
    }
    if (token.kind === 'phrase') {
      return 'tok-phrase';
    }
    if (token.kind === 'paren') {
      return 'tok-paren';
    }
    if (token.kind === 'error') {
      return 'tok-error';
    }
    return '';
  }

  applySaved(item: SavedSearch): void {
    this.store.restore(item);
  }

  addKeyword(): void {
    const value = this.keyword().trim();
    const field = this.field();
    if (field === 'exists') {
      this.store.insert('_exists_:doi');
      return;
    }
    if (!value) {
      return;
    }
    const quoted = /\s/.test(value) ? `"${value.replace(/"/g, '')}"` : value;
    if (field === 'anywhere') {
      this.store.insert(quoted);
    } else if (field === 'year>') {
      this.store.insert(`yearPublished>${value.replace(/\D/g, '')}`);
    } else if (field === 'year<') {
      this.store.insert(`yearPublished<${value.replace(/\D/g, '')}`);
    } else {
      this.store.insert(`${field}:${quoted}`);
    }
    this.keyword.set('');
  }
}
