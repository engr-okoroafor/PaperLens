import { afterNextRender, Component, ElementRef, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { animate } from 'motion';

import { TooltipDirective } from './ui/tooltip/tooltip.directive';
import { TooltipService } from './ui/tooltip/tooltip.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, TooltipDirective],
  templateUrl: './app.html',
})
export class App {
  readonly tips = inject(TooltipService);
  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      const header = this.host.nativeElement.querySelector('.site-header');
      if (header) {
        animate(header, { opacity: [0, 1], y: [-10, 0] }, { duration: 0.55 });
      }
    });
  }
}
