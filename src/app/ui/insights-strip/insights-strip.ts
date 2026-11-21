import { Component, inject } from '@angular/core';

import { SearchStore } from '../../core/services/search-store.service';
import { LanguageService } from '../../core/services/language.service';
import { Counter } from '../counter/counter';

@Component({
  selector: 'app-insights-strip',
  imports: [Counter],
  templateUrl: './insights-strip.html',
})
export class InsightsStrip {
  readonly store = inject(SearchStore);
  readonly lang = inject(LanguageService);
}
