import { afterNextRender, Component, ElementRef, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { animate } from 'motion';

import { LibraryService } from './core/services/library.service';
import { TourService } from './core/services/tour.service';
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
  readonly tour = inject(TourService);
  readonly showScrollControls = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => {
      try {
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }
      } catch {}
      const header = this.host.nativeElement.querySelector('.site-header');
      if (header) {
        animate(header, { opacity: [0, 1], y: [-10, 0] }, { duration: 0.55 });
      }

      window.addEventListener('scroll', () => {
        const scrolled = window.scrollY > 250;
        if (scrolled !== this.showScrollControls()) {
          this.showScrollControls.set(scrolled);
        }
      }, { passive: true });
    });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollToBottom(): void {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  }
}
