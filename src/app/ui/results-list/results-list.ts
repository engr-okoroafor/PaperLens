import { afterEveryRender, Component, ElementRef, inject } from '@angular/core';
import { animate, stagger } from 'motion';

import { SearchStore } from '../../core/services/search-store.service';
import { PaperCard } from '../paper-card/paper-card';

@Component({
  selector: 'app-results-list',
  imports: [PaperCard],
  templateUrl: './results-list.html',
})
export class ResultsList {
  readonly store = inject(SearchStore);
  private readonly host = inject(ElementRef<HTMLElement>);
  private animatedKey = '';

  constructor() {
    afterEveryRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || this.store.loading()) {
        return;
      }
      const key = this.store.papers().map((paper) => paper.id).join('|');
      if (!key || key === this.animatedKey) {
        return;
      }
      this.animatedKey = key;
      const cards = this.host.nativeElement.querySelectorAll('[data-paper]');
      if (cards.length) {
        animate(cards, { opacity: [0, 1], y: [16, 0] }, { delay: stagger(0.045), duration: 0.5, type: 'spring', bounce: 0.18 });
      }
    });
  }
}
