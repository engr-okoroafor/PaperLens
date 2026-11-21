import { Injectable, signal } from '@angular/core';

export interface ExternalLinkTarget {
  url: string;
  label?: string;
  title?: string;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly pendingLink = signal<ExternalLinkTarget | null>(null);

  confirmNavigation(url: string, label = 'External Resource', title = ''): void {
    this.pendingLink.set({ url, label, title });
  }

  proceed(): void {
    const target = this.pendingLink();
    if (target) {
      window.open(target.url, '_blank', 'noopener,noreferrer');
      this.pendingLink.set(null);
    }
  }

  cancel(): void {
    this.pendingLink.set(null);
  }
}

