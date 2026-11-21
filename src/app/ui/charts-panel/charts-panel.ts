import { Component, computed, inject, signal } from '@angular/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';

import { echarts } from '../../core/charts/echarts';
import { barChart, donutChart, prefersReducedMotion, yearChart } from '../../core/charts/chart-options';
import { Facet } from '../../core/models/paper';
import { facetLabel } from '../../core/query/compose-query';
import { SearchStore } from '../../core/services/search-store.service';
import { TooltipDirective } from '../tooltip/tooltip.directive';

@Component({
  selector: 'app-charts-panel',
  imports: [NgxEchartsDirective, TooltipDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './charts-panel.html',
})
export class ChartsPanel {
  readonly store = inject(SearchStore);
  readonly donut = signal<'type' | 'language'>('type');
  private readonly motion = !prefersReducedMotion();

  readonly yearOptions = computed(() => yearChart(this.store.aggregates()?.years ?? [], this.motion));
  readonly publisherOptions = computed(() => barChart(this.store.aggregates()?.publishers ?? [], this.motion));
  readonly topicOptions = computed(() => barChart(this.store.aggregates()?.topics ?? [], this.motion));
  readonly donutOptions = computed(() =>
    donutChart(
      this.donut() === 'type'
        ? (this.store.aggregates()?.documentTypes ?? [])
        : (this.store.aggregates()?.languages ?? []),
      this.motion,
    ),
  );

  readonly sourceLabel = computed(() => {
    switch (this.store.aggregateSource()) {
      case 'core':
        return 'Aggregated by CORE across every work that matches this query.';
      case 'sample':
        return 'Sample data. Counts cover the whole built-in set that matches, not only this page.';
      case 'loaded':
        return 'CORE did not return aggregates, so these charts count the papers loaded so far.';
      default:
        return '';
    }
  });

  facetText(): string {
    const facet = this.store.facet();
    return facet ? facetLabel(facet) : '';
  }

  onSeries(event: { componentType?: string; name?: string }, kind: Facet['kind']): void {
    if (event.componentType && event.componentType !== 'series') {
      return;
    }
    const value = event.name?.trim();
    if (!value) {
      return;
    }
    this.store.toggleFacet({ kind, value });
  }
}
