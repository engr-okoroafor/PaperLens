import type { EChartsCoreOption } from 'echarts/core';

import { AggregateBucket } from '../models/paper';

const LIME = '#a3e635';
const AXIS = '#b7c4b2';
const PALETTE = ['#a3e635', '#84cc16', '#4ade80', '#bef264', '#65a30d', '#d9f99d', '#86efac', '#ecfccb'];

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function yearChart(buckets: AggregateBucket[], motion: boolean): EChartsCoreOption {
  return {
    ...base(motion),
    tooltip: richTooltip(sum(buckets), true, 'axis'),
    grid: { left: 42, right: 12, top: 24, bottom: 28 },
    xAxis: axis(buckets.map((bucket) => bucket.label), 'category'),
    yAxis: axis([], 'value'),
    series: [
      {
        type: 'line',
        name: 'Works',
        smooth: true,
        data: buckets.map((bucket) => bucket.count),
        showSymbol: true,
        symbolSize: 8,
        lineStyle: { width: 2.4, color: LIME, shadowBlur: 14, shadowColor: 'rgba(163, 230, 53, 0.7)' },
        itemStyle: { color: '#ecfccb', shadowBlur: 10, shadowColor: 'rgba(163, 230, 53, 0.85)' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(163, 230, 53, 0.5)' },
              { offset: 1, color: 'rgba(132, 204, 22, 0.02)' },
            ],
          },
        },
      },
    ],
  };
}

export function barChart(buckets: AggregateBucket[], motion: boolean): EChartsCoreOption {
  const rows = [...buckets].reverse();
  return {
    ...base(motion),
    tooltip: richTooltip(sum(buckets), false),
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    xAxis: axis([], 'value'),
    yAxis: {
      ...axis(rows.map((bucket) => bucket.label), 'category'),
      axisLabel: { color: AXIS, width: 110, overflow: 'truncate' },
    },
    series: [
      {
        type: 'bar',
        name: 'Works',
        data: rows.map((bucket) => bucket.count),
        barWidth: 12,
        itemStyle: {
          borderRadius: 8,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#65a30d' },
              { offset: 1, color: LIME },
            ],
          },
          shadowBlur: 12,
          shadowColor: 'rgba(163, 230, 53, 0.35)',
        },
      },
    ],
  };
}

export function donutChart(buckets: AggregateBucket[], motion: boolean): EChartsCoreOption {
  return {
    ...base(motion),
    tooltip: richTooltip(sum(buckets), false),
    series: [
      {
        type: 'pie',
        radius: ['54%', '76%'],
        center: ['50%', '52%'],
        data: buckets.map((bucket, index) => ({
          name: bucket.label,
          value: bucket.count,
          itemStyle: {
            color: PALETTE[index % PALETTE.length],
            shadowBlur: 16,
            shadowColor: 'rgba(163, 230, 53, 0.25)',
          },
        })),
        label: { color: '#e7f0e2', fontSize: 11 },
        itemStyle: { borderColor: '#07110c', borderWidth: 2 },
      },
    ],
  };
}

function base(motion: boolean): EChartsCoreOption {
  return {
    backgroundColor: 'transparent',
    animationDuration: motion ? 1100 : 0,
    animationEasing: 'cubicOut',
    textStyle: { fontFamily: 'Outfit, sans-serif' },
  };
}

function axis(data: string[], type: 'category' | 'value'): Record<string, unknown> {
  return {
    type,
    data: type === 'category' ? data : undefined,
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.16)' } },
    axisLabel: { color: AXIS },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
  };
}

function sum(buckets: AggregateBucket[]): number {
  return buckets.reduce((total, bucket) => total + bucket.count, 0);
}

function richTooltip(total: number, includeYear: boolean, trigger: 'item' | 'axis' = 'item'): EChartsCoreOption['tooltip'] {
  return {
    trigger,
    backgroundColor: 'rgba(8, 16, 12, 0.94)',
    borderColor: 'rgba(163, 230, 53, 0.38)',
    textStyle: { color: '#f3f7ef' },
    extraCssText: 'border-radius:12px;box-shadow:0 0 24px rgba(163,230,53,0.18);',
    formatter: (params: unknown) => {
      const point = (Array.isArray(params) ? params[0] : params) as { name?: string; value?: number };
      const count = Number(point?.value ?? 0);
      const name = point?.name ?? '';
      const percent = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
      const year = includeYear && /^\d{4}$/.test(name) ? `<div>Year ${name}</div>` : '';
      return `<strong>${escapeHtml(name)}</strong>${year}<div>${count} works</div><div>${percent}% of this chart</div>`;
    },
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
