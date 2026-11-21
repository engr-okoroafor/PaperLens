import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'paperlens.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>('dark');

  constructor() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(THEME_KEY) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark') {
        this.setMode(saved);
        return;
      }
    }
    this.applyTheme('dark');
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    this.applyTheme(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_KEY, mode);
    }
  }

  toggle(): void {
    this.setMode(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private applyTheme(mode: ThemeMode): void {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (mode === 'light') {
        root.classList.add('light-mode');
        root.classList.remove('dark-mode');
        root.setAttribute('data-theme', 'light');
      } else {
        root.classList.remove('light-mode');
        root.classList.add('dark-mode');
        root.setAttribute('data-theme', 'dark');
      }
    }
  }
}
