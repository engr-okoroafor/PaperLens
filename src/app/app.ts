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
  readonly langMenuPosition = signal<{ top: number; right: number }>({ top: 0, right: 0 });
  private readonly host = inject(ElementRef<HTMLElement>);

  constructor() {
    afterNextRender(() => {
      try {
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }
      } catch {}

      window.addEventListener('scroll', () => {
        const scrolled = window.scrollY > 200;
        if (scrolled !== this.showScrollControls()) {
          this.showScrollControls.set(scrolled);
        }
        if (this.langMenuOpen()) {
          this.updateDropdownPosition();
        }
      }, { passive: true });

      window.addEventListener('resize', () => {
        if (this.langMenuOpen()) {
          this.updateDropdownPosition();
        }
      }, { passive: true });

      window.addEventListener('click', (event: MouseEvent) => {
        const target = event.target as HTMLElement | null;
        if (this.langMenuOpen() && target && !target.closest('.header-lang-container') && !target.closest('.header-lang-dropdown')) {
          this.langMenuOpen.set(false);
        }
      });
    });
  }

  toggleLangMenu(event: MouseEvent): void {
    event.stopPropagation();
    const willOpen = !this.langMenuOpen();
    if (willOpen) {
      this.updateDropdownPosition();
    }
    this.langMenuOpen.set(willOpen);
  }

  private updateDropdownPosition(): void {
    const trigger = this.host.nativeElement.querySelector('.btn-lang-header') as HTMLElement | null;
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      this.langMenuPosition.set({
        top: rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
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
