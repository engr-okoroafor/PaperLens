import { Component, HostListener, inject } from '@angular/core';

import { LibraryService } from '../../core/services/library.service';
import { SearchStore } from '../../core/services/search-store.service';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-reading-list',
  imports: [TooltipDirective],
  templateUrl: './reading-list.html',
})
export class ReadingList {
  readonly library = inject(LibraryService);
  readonly store = inject(SearchStore);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.library.readingOpen.set(false);
  }
}
