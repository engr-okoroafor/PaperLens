import { describe, expect, it } from 'vitest';

import { aggregatePapers, normalizeAggregates, normalizeWork } from './normalize';
import { Paper } from '../models/paper';

describe('CORE normalizer', () => {
  it('reads camelCase work records and snake_case aliases', () => {
    const camel = normalizeWork({
      id: 42,
      title: 'Drone routes',
      authors: [{ name: 'Mina Cho' }, 'Jonas Keller'],
      yearPublished: 2024,
      publisher: { name: 'IEEE' },
      journals: [{ title: 'Letters' }],
      language: { code: 'en', name: 'English' },
      documentType: 'research article',
      citationCount: 8,
      doi: '10.1/demo',
      downloadUrl: 'https://example.com/paper.pdf',
    });
    expect(camel?.authors).toEqual(['Mina Cho', 'Jonas Keller']);
    expect(camel?.year).toBe(2024);
    expect(camel?.publisher).toBe('IEEE');
    expect(camel?.journal).toBe('Letters');
    expect(camel?.hasFullText).toBe(true);

    const snake = normalizeWork({
      title: 'Older record',
      year_published: '2019',
      document_type: 'thesis',
      citation_count: null,
    });
    expect(snake?.year).toBe(2019);
    expect(snake?.documentType).toBe('thesis');
    expect(snake?.hasFullText).toBe(false);
  });

  it('reads CORE aggregation maps', () => {
    const aggregates = normalizeAggregates({
      aggregations: {
        yearPublished: { '2020': 4, '2021': 9 },
        publisher: { IEEE: 3 },
        language: [{ value: 'English', count: 6 }],
        documentType: { article: 2 },
        authors: { Cho: 2 },
        fieldOfStudy: { Engineering: 5 },
      },
    });
    expect(aggregates?.years.map((bucket) => bucket.label)).toEqual(['2020', '2021']);
    expect(aggregates?.publishers[0]?.count).toBe(3);
    expect(aggregates?.languages[0]?.label).toBe('English');
    expect(aggregates?.topics[0]?.label).toBe('Engineering');
  });

  it('counts a loaded page when CORE sends no buckets', () => {
    const paper = {
      id: '1',
      title: 'Climate machine learning windows',
      authors: ['Ada'],
      year: 2022,
      publisher: 'PLOS',
      journal: null,
      abstract: null,
      doi: null,
      downloadUrl: null,
      language: 'English',
      documentType: 'review',
      citationCount: null,
      hasFullText: false,
      fieldOfStudy: null,
    } satisfies Paper;
    const aggregates = aggregatePapers([paper, { ...paper, id: '2', year: 2022 }]);
    expect(aggregates.years).toEqual([{ label: '2022', count: 2 }]);
    expect(aggregates.publishers[0]?.label).toBe('PLOS');
    expect(aggregates.topics.length).toBeGreaterThan(0);
  });
});
