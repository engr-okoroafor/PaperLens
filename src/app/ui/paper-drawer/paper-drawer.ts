import { Component, HostListener, inject } from '@angular/core';

import { SearchStore } from '../../core/services/search-store.service';
import { LibraryService } from '../../core/services/library.service';
import { ToastService } from '../../core/services/toast.service';
import { LanguageService } from '../../core/services/language.service';
import { ModalService } from '../../core/services/modal.service';
import { exportSinglePaperDoc, exportSinglePaperPdf } from '../../core/export/export-papers';
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
  readonly lang = inject(LanguageService);
  readonly modal = inject(ModalService);
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

  downloadPdf(): void {
    const paper = this.store.selected();
    if (paper) {
      exportSinglePaperPdf(paper);
      this.toast.show('Preparing branded single-paper PDF report...');
    }
  }

  downloadDoc(): void {
    const paper = this.store.selected();
    if (paper) {
      exportSinglePaperDoc(paper);
      this.toast.show('Exported single paper as Word (.doc)...');
    }
  }

  openExternal(url: string, label: string): void {
    const paper = this.store.selected();
    this.modal.confirmNavigation(url, label, paper?.title || '');
  }
}
