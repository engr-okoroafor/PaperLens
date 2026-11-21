import { Component, HostListener, inject } from '@angular/core';

import { TourService } from '../../core/services/tour.service';

@Component({
  selector: 'app-help-dialog',
  templateUrl: './help-dialog.html',
})
export class HelpDialog {
  readonly tour = inject(TourService);

  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
    if (event.key === '/' && !typing) {
      event.preventDefault();
      document.getElementById('query')?.focus();
    }
    if ((event.key === '?' || (event.key === '/' && event.shiftKey)) && !typing) {
      event.preventDefault();
      this.tour.helpOpen.update((open) => !open);
    }
    if (event.key === 'Escape') {
      this.tour.helpOpen.set(false);
      if (this.tour.open()) {
        this.tour.finish();
      }
    }
  }
}
