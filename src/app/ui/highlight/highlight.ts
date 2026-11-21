import { Component, computed, input } from '@angular/core';

import { highlight } from '../../core/highlight/highlight';

@Component({
  selector: 'app-highlight',
  template: `
    @for (segment of segments(); track $index) {
      @if (segment.hit) {
        <mark class="hit">{{ segment.text }}</mark>
      } @else {
        <span>{{ segment.text }}</span>
      }
    }
  `,
})
export class HighlightText {
  readonly text = input('');
  readonly terms = input<readonly string[]>([]);
  readonly segments = computed(() => highlight(this.text(), this.terms()));
}
