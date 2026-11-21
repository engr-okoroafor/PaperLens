import { Component, computed, input, signal } from '@angular/core';

import { Paper } from '../../core/models/paper';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-paper-card',
  imports: [TooltipDirective],
  templateUrl: './paper-card.html',
})
export class PaperCard {
  readonly paper = input.required<Paper>();
  readonly sample = input(false);
  readonly expanded = signal(false);

  readonly doiUrl = computed(() => {
    const doi = this.paper().doi;
    return doi ? `https://doi.org/${encodeURI(doi)}` : null;
  });

  readonly coreUrl = computed(() => {
    const id = this.paper().id;
    return /^\d+$/.test(id) ? `https://core.ac.uk/works/${id}` : null;
  });

  readonly authorLine = computed(() => this.paper().authors.join(', ') || 'Unknown authors');

  toggle(): void {
    this.expanded.update((open) => !open);
  }
}
