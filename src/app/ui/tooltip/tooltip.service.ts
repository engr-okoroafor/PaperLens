import { Injectable, signal } from '@angular/core';

export type TooltipPlacement = 'above' | 'below';

@Injectable({ providedIn: 'root' })
export class TooltipService {
  readonly text = signal<string | null>(null);
  readonly x = signal(0);
  readonly y = signal(0);
  readonly placement = signal<TooltipPlacement>('above');

  show(text: string, x: number, y: number, placement: TooltipPlacement): void {
    const trimmed = text.trim();
    if (!trimmed) {
      this.hide();
      return;
    }
    this.text.set(trimmed);
    this.x.set(x);
    this.y.set(y);
    this.placement.set(placement);
  }

  hide(): void {
    this.text.set(null);
  }
}
