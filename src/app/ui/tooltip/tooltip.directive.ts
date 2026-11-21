import { Directive, ElementRef, inject } from '@angular/core';
import { input } from '@angular/core';

import { TooltipService } from './tooltip.service';

@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'open()',
    '(mouseleave)': 'close()',
    '(focusin)': 'open()',
    '(focusout)': 'close()',
  },
})
export class TooltipDirective {
  readonly appTooltip = input.required<string>();

  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly tips = inject(TooltipService);

  open(): void {
    const rect = this.element.nativeElement.getBoundingClientRect();
    const above = rect.top > 72;
    const x = Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2));
    const y = above ? rect.top : rect.bottom;
    this.tips.show(this.appTooltip(), x, y, above ? 'above' : 'below');
  }

  close(): void {
    this.tips.hide();
  }
}
