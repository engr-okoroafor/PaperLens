import { Component, inject } from '@angular/core';

import { SearchStore } from '../../core/services/search-store.service';

@Component({
  selector: 'app-insights-strip',
  templateUrl: './insights-strip.html',
})
export class InsightsStrip {
  readonly store = inject(SearchStore);
}
