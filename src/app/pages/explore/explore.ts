import { Component, inject } from '@angular/core';

import { SearchStore } from '../../core/services/search-store.service';
import { TooltipDirective } from '../../ui/tooltip/tooltip.directive';

@Component({
  selector: 'app-explore',
  imports: [TooltipDirective],
  templateUrl: './explore.html',
})
export class Explore {
  readonly store = inject(SearchStore);

  onDraft(event: Event): void {
    this.store.setDraft((event.target as HTMLInputElement).value);
  }

  onCount(event: Event): void {
    this.store.setLimit(Number((event.target as HTMLInputElement).value));
  }

  submit(event: Event): void {
    event.preventDefault();
    this.store.commitNow();
  }
}
