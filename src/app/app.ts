import { afterNextRender, Component, ElementRef, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { animate } from 'motion';

import { LibraryService } from './core/services/library.service';
import { TourService } from './core/services/tour.service';
import { ThemeService } from './core/services/theme.service';
import { LanguageService, LanguageCode } from './core/services/language.service';
import { ModalService } from './core/services/modal.service';
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
  readonly theme = inject(ThemeService);
  readonly lang = inject(LanguageService);
  readonly modal = inject(ModalService);
  readonly showScrollControls = signal(false);
  readonly langMenuOpen = signal(false);
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
        const scrolled = window.scrollY > 200;
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

  toggleTheme(): void {
    this.theme.toggle();
  }

  changeLanguage(code: LanguageCode): void {
    this.lang.setLanguage(code);
    this.langMenuOpen.set(false);
  }
}
