import { Injectable, signal } from '@angular/core';

export interface TourStep {
  id: 'count' | 'search' | 'charts';
  title: string;
  body: string;
}

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'count',
    title: 'Choose how many papers come back',
    body: 'The slider and the number field stay in lockstep, from 10 to 100. Switch between pages and “load more” when you want the next batch.',
  },
  {
    id: 'search',
    title: 'Search with boolean syntax',
    body: 'AND, OR, NOT, quotes, and parentheses are highlighted as you type. Example pills and the query builder write advanced search queries. The refine box filters only the papers already loaded.',
  },
  {
    id: 'charts',
    title: 'Interactive visual analytics',
    body: 'Charts populate dynamically as you search. Hover any data point for count and market share. Click any year, publisher, document type, or topic to instantly filter your results.',
  },
];

const STORAGE_KEY = 'paperlens.tour-done';

@Injectable({ providedIn: 'root' })
export class TourService {
  readonly open = signal(false);
  readonly step = signal(0);
  readonly helpOpen = signal(false);

  constructor() {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== '1') {
      this.open.set(true);
    }
  }

  start(): void {
    this.helpOpen.set(false);
    this.step.set(0);
    this.open.set(true);
  }

  prev(): void {
    if (this.step() > 0) {
      this.step.update((step) => step - 1);
    }
  }

  next(): void {
    if (this.step() >= TOUR_STEPS.length - 1) {
      this.finish();
      return;
    }
    this.step.update((step) => step + 1);
  }

  finish(): void {
    this.open.set(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
  }
}
