import { Component, inject } from '@angular/core';

import { SearchStore } from '../../core/services/search-store.service';
import { CountControl } from '../../ui/count-control/count-control';
import { ResultsList } from '../../ui/results-list/results-list';
import { SearchPanel } from '../../ui/search-panel/search-panel';

@Component({
  selector: 'app-explore',
  imports: [ResultsList, CountControl, SearchPanel],
  templateUrl: './explore.html',
})
export class Explore {
  readonly store = inject(SearchStore);
}
