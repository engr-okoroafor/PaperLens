import { Component, inject } from '@angular/core';

import { SearchStore } from '../../core/services/search-store.service';
import { CountControl } from '../../ui/count-control/count-control';
import { ResultsList } from '../../ui/results-list/results-list';
import { TooltipDirective } from '../../ui/tooltip/tooltip.directive';

@Component({
  selector: 'app-explore',
  imports: [TooltipDirective, ResultsList, CountControl],
  templateUrl: './explore.html',
})
export class Explore {
  readonly store = inject(SearchStore);

  onDraft(event: Event): void {
    this.store.setDraft((event.target as HTMLInputElement).value);
  }

  submit(event: Event): void {
    event.preventDefault();
    this.store.commitNow();
  }
}
