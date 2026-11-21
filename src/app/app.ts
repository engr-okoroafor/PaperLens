import { afterNextRender, Component, ElementRef, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { animate } from 'motion';

import { LibraryService } from './core/services/library.service';
import { ToastHost } from './ui/toast-host/toast-host';
import { TooltipDirective } from './ui/tooltip/tooltip.directive';
import { TooltipService } from './ui/tooltip/tooltip.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, TooltipDirective, ToastHost],
  templateUrl: './app.html',
})
export class App {
  readonly tips = inject(TooltipService);
  readonly library = inject(LibraryService);
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
