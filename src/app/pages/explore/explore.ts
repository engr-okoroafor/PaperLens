import { Component, inject } from '@angular/core';

import { SearchStore } from '../../core/services/search-store.service';
import { HelpDialog } from '../../ui/help-dialog/help-dialog';
import { ChartsPanel } from '../../ui/charts-panel/charts-panel';
import { CountControl } from '../../ui/count-control/count-control';
import { InsightsStrip } from '../../ui/insights-strip/insights-strip';
import { PaperDrawer } from '../../ui/paper-drawer/paper-drawer';
import { ReadingList } from '../../ui/reading-list/reading-list';
import { ResultsList } from '../../ui/results-list/results-list';
import { SearchPanel } from '../../ui/search-panel/search-panel';
import { Tour } from '../../ui/tour/tour';

@Component({
  selector: 'app-explore',
  imports: [ResultsList, CountControl, SearchPanel, ChartsPanel, InsightsStrip, PaperDrawer, ReadingList, Tour, HelpDialog],
  templateUrl: './explore.html',
})
export class Explore {
  readonly store = inject(SearchStore);
}
