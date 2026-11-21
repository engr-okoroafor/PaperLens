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
    body: 'The slider and the number field stay in lockstep, from 10 to 100. Switch between pages and “load more” when you want the next slice.',
  },
  {
    id: 'search',
    title: 'Search with boolean syntax',
    body: 'AND, OR, NOT, quotes, and parentheses are highlighted as you type. Example pills and the field builder write CORE queries. The second box filters only the papers already loaded.',
  },
  {
    id: 'charts',
    title: 'Read the whole result set',
    body: 'Charts stay empty until you search. Hover a mark for the count and its share of the chart. Click a year, bar, or slice to narrow the list.',
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
