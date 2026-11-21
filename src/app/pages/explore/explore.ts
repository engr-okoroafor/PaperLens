import { Component, signal } from '@angular/core';

import { TooltipDirective } from '../../ui/tooltip/tooltip.directive';

@Component({
  selector: 'app-explore',
  imports: [TooltipDirective],
  templateUrl: './explore.html',
})
export class Explore {
  readonly draft = signal('');
  readonly count = signal(20);
  readonly submitted = signal('');

  onDraft(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  onCount(event: Event): void {
    const next = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(next)) {
      this.count.set(Math.min(100, Math.max(10, Math.round(next))));
    }
  }

  submit(event: Event): void {
    event.preventDefault();
    this.submitted.set(this.draft().trim());
  }
}
