import { describe, expect, it } from 'vitest';

import { papersToBibtex, papersToCsv } from '../export/export-papers';
import { composeQuery } from '../query/compose-query';
import { filterSample } from '../data/sample-papers';
import { highlight } from './highlight';

describe('highlight, export, and query composition', () => {
  it('marks phrases without treating regex characters as syntax', () => {
    const segments = highlight('A drone (package) study', ['(package)', 'drone']);
    expect(segments.filter((segment) => segment.hit).map((segment) => segment.text)).toEqual(['drone', '(package)']);
  });

  it('exports BibTeX and CSV from the loaded papers', () => {
    const papers = filterSample('title:"machine learning" AND yearPublished>2020');
    expect(papers.length).toBeGreaterThan(0);
    expect(papersToBibtex(papers)).toContain('@article{');
    expect(papersToBibtex(papers)).toContain('title = {');
    expect(papersToCsv(papers).split('\n')[0]).toContain('doi');
  });

  it('adds year bounds and a clicked facet to the CORE query', () => {
    expect(composeQuery('drone', { kind: 'year', value: '2023' }, 2018, null)).toBe(
      '(drone) AND yearPublished>=2018 AND yearPublished:2023',
    );
  });

  it('filters the sample corpus with the boolean example', () => {
    const titles = filterSample('(drone AND (package OR delivery))').map((paper) => paper.title);
    expect(titles.some((title) => title.includes('rooftop package'))).toBe(true);
    expect(titles.some((title) => title.includes('Inspection'))).toBe(false);
  });
});
