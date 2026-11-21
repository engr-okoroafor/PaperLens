import { Component, inject } from '@angular/core';

import { SortKey } from '../../core/query/sort-papers';
import { SearchStore } from '../../core/services/search-store.service';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-count-control',
  imports: [TooltipDirective],
  templateUrl: './count-control.html',
})
export class CountControl {
  readonly store = inject(SearchStore);

  onCount(event: Event): void {
    this.store.setLimit(Number((event.target as HTMLInputElement).value));
  }

  onSort(event: Event): void {
    this.store.setSort((event.target as HTMLSelectElement).value as SortKey);
  }

  onYear(bound: 'from' | 'to', event: Event): void {
    this.store.setYear(bound, (event.target as HTMLInputElement).value);
  }
}
