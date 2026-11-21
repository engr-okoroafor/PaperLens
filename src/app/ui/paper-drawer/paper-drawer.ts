import { Component, HostListener, inject } from '@angular/core';

import { SearchStore } from '../../core/services/search-store.service';
import { LibraryService } from '../../core/services/library.service';
import { ToastService } from '../../core/services/toast.service';
import { HighlightText } from '../highlight/highlight';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-paper-drawer',
  imports: [HighlightText, TooltipDirective],
  templateUrl: './paper-drawer.html',
})
export class PaperDrawer {
  readonly store = inject(SearchStore);
  readonly library = inject(LibraryService);
  private readonly toast = inject(ToastService);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.store.closePaper();
  }

  bookmark(): void {
    const paper = this.store.selected();
    if (!paper) {
      return;
    }
    const saved = this.library.toggleBookmark(paper);
    this.toast.show(saved ? 'Saved to the reading list.' : 'Removed from the reading list.');
  }
}
