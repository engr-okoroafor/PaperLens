import { afterEveryRender, Component, effect, inject, signal } from '@angular/core';

import { TOUR_STEPS, TourService } from '../../core/services/tour.service';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-tour',
  templateUrl: './tour.html',
})
export class Tour {
  readonly tour = inject(TourService);
  readonly steps = TOUR_STEPS;
  readonly rect = signal<Rect | null>(null);

  constructor() {
    effect(() => {
      const step = this.steps[this.tour.step()];
      if (!this.tour.open() || !step) {
        return;
      }
      queueMicrotask(() => document.querySelector(`[data-tour="${step.id}"]`)?.scrollIntoView({ block: 'center', inline: 'nearest' }));
    });

    afterEveryRender(() => {
      if (!this.tour.open()) {
        return;
      }
      const step = this.steps[this.tour.step()];
      const target = step ? document.querySelector(`[data-tour="${step.id}"]`) : null;
      if (!target) {
        this.rect.set(null);
        return;
      }
      const box = target.getBoundingClientRect();
      const next = { top: box.top - 8, left: box.left - 8, width: box.width + 16, height: box.height + 16 };
      const current = this.rect();
      if (current && current.top === next.top && current.left === next.left && current.width === next.width && current.height === next.height) {
        return;
      }
      this.rect.set(next);
    });
  }
}
