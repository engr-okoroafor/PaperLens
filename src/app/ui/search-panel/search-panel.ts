import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';

import { LibraryService, SavedSearch } from '../../core/services/library.service';
import { SearchStore } from '../../core/services/search-store.service';
import { LanguageService } from '../../core/services/language.service';
import { EXAMPLE_QUERIES, QueryToken } from '../../core/query/boolean-query';
import { TooltipDirective } from '../tooltip/tooltip.directive';

export const TYPEWRITER_SUGGESTIONS: readonly string[] = [
  '(drone AND (package OR delivery))',
  'quantum computing AND cryptography',
  'climate change AND (coral OR reef)',
  'title:"machine learning" AND yearPublished>2022',
  'CRISPR AND gene therapy',
  'neural networks AND natural language',
  'solar cells AND perovskite',
];

@Component({
  selector: 'app-search-panel',
  imports: [TooltipDirective],
  templateUrl: './search-panel.html',
})
export class SearchPanel implements OnInit, OnDestroy {
  readonly store = inject(SearchStore);
  readonly library = inject(LibraryService);
  readonly lang = inject(LanguageService);
  readonly examples = EXAMPLE_QUERIES;
  readonly keyword = signal('');
  readonly field = signal('anywhere');
  readonly animatedPlaceholder = signal('');

  private typewriterTimer: ReturnType<typeof setTimeout> | null = null;
  private suggestionIndex = 0;
  private charIndex = 0;
  private isDeleting = false;
  private lastLang = '';

  constructor() {
    this.animatedPlaceholder.set(this.lang.getSuggestions()[0]);
  }

  ngOnInit(): void {
    this.lastLang = this.lang.currentLang();
    this.tickTypewriter();
  }

  ngOnDestroy(): void {
    if (this.typewriterTimer) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private tickTypewriter(): void {
    const currentLang = this.lang.currentLang();
    if (this.lastLang && this.lastLang !== currentLang) {
      this.lastLang = currentLang;
      this.suggestionIndex = 0;
      this.charIndex = 0;
      this.isDeleting = false;
    }
    const suggestions = this.lang.getSuggestions();
    const currentText = suggestions[this.suggestionIndex % suggestions.length];

    if (this.isDeleting) {
      this.charIndex -= 1;
      this.animatedPlaceholder.set(currentText.substring(0, this.charIndex));

      if (this.charIndex <= 0) {
        this.isDeleting = false;
        this.suggestionIndex = (this.suggestionIndex + 1) % suggestions.length;
        this.typewriterTimer = setTimeout(() => this.tickTypewriter(), 400);
        return;
      }
      this.typewriterTimer = setTimeout(() => this.tickTypewriter(), 35);
    } else {
      this.charIndex += 1;
      this.animatedPlaceholder.set(currentText.substring(0, this.charIndex));

      if (this.charIndex >= currentText.length) {
        this.isDeleting = true;
        this.typewriterTimer = setTimeout(() => this.tickTypewriter(), 2200);
        return;
      }
      this.typewriterTimer = setTimeout(() => this.tickTypewriter(), 70);
    }
  }

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
