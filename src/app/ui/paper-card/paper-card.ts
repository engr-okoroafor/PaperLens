import { Component, computed, inject, input, signal } from '@angular/core';

import { Paper } from '../../core/models/paper';
import { LibraryService } from '../../core/services/library.service';
import { SearchStore } from '../../core/services/search-store.service';
import { ToastService } from '../../core/services/toast.service';
import { HighlightText } from '../highlight/highlight';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-paper-card',
  imports: [TooltipDirective, HighlightText],
  templateUrl: './paper-card.html',
})
export class PaperCard {
  readonly paper = input.required<Paper>();
  readonly sample = input(false);
  readonly expanded = signal(false);
  readonly store = inject(SearchStore);
  readonly library = inject(LibraryService);
  private readonly toast = inject(ToastService);

  readonly doiUrl = computed(() => {
    const doi = this.paper().doi;
    return doi ? `https://doi.org/${encodeURI(doi)}` : null;
  });

  readonly coreUrl = computed(() => {
    const id = this.paper().id;
    return /^\d+$/.test(id) ? `https://core.ac.uk/works/${id}` : null;
  });

  readonly authorLine = computed(() => this.paper().authors.join(', ') || 'Unknown authors');

  toggle(event: Event): void {
    event.stopPropagation();
    this.expanded.update((open) => !open);
  }

  bookmark(event: Event): void {
    event.stopPropagation();
    const saved = this.library.toggleBookmark(this.paper());
    this.toast.show(saved ? 'Saved to the reading list.' : 'Removed from the reading list.');
  }

  open(): void {
    this.store.openPaper(this.paper().id);
  }
}
