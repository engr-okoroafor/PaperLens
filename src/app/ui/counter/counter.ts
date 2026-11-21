import { Component, effect, input, signal } from '@angular/core';
import { animate } from 'motion';

@Component({
  selector: 'app-counter',
  template: `{{ display() }}`,
})
export class Counter {
  readonly value = input(0);
  readonly display = signal('0');

  constructor() {
    effect((onCleanup) => {
      const target = this.value();
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || !Number.isFinite(target)) {
        this.display.set(target.toLocaleString());
        return;
      }
      const playback = animate(0, target, {
        duration: 0.7,
        ease: 'easeOut',
        onUpdate: (latest) => this.display.set(Math.round(Number(latest)).toLocaleString()),
      });
      onCleanup(() => playback.stop());
    });
  }
}
