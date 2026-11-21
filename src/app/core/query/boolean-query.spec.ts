import { describe, expect, it } from 'vitest';

import { Paper } from '../models/paper';
import { insertClause, matchesPaper, parseQuery, positiveTerms } from './boolean-query';

function paper(overrides: Partial<Paper>): Paper {
  return {
    id: 'p',
    title: '',
    authors: [],
    year: null,
    publisher: null,
    journal: null,
    abstract: null,
    doi: null,
    downloadUrl: null,
    language: null,
    documentType: null,
    citationCount: null,
    hasFullText: false,
    fieldOfStudy: null,
    ...overrides,
  };
}

describe('boolean query parser', () => {
  it('accepts grouped AND and OR and rejects an open parenthesis', () => {
    const parsed = parseQuery('(drone AND (package OR delivery))');
    expect(parsed.valid).toBe(true);
    expect(parsed.errors).toEqual([]);
    expect(parseQuery('(drone AND package').valid).toBe(false);
    expect(parseQuery('(drone AND package').errors.join(' ')).toMatch(/open/i);
  });

  it('matches terms, phrases, NOT, and parentheses', () => {
    const dronePackage = paper({ title: 'Drone package routes', abstract: 'A delivery plan' });
    const droneOnly = paper({ title: 'Inspection drones', abstract: 'No cargo here' });
    const delivery = paper({ title: 'Drone delivery windows' });
    const ast = parseQuery('(drone AND (package OR delivery))').ast;
    expect(ast).not.toBeNull();
    if (!ast) {
      return;
    }
    expect(matchesPaper(dronePackage, ast)).toBe(true);
    expect(matchesPaper(delivery, ast)).toBe(true);
    expect(matchesPaper(droneOnly, ast)).toBe(false);
    expect(matchesPaper(droneOnly, parseQuery('drone NOT package').ast!)).toBe(true);
    expect(matchesPaper(paper({ title: 'Exact machine learning paper' }), parseQuery('"machine learning"').ast!)).toBe(true);
    expect(matchesPaper(paper({ title: 'Machine vision learning' }), parseQuery('"machine learning"').ast!)).toBe(false);
  });

  it('applies field filters, ranges, and exists checks', () => {
    const work = paper({
      title: 'Machine learning for wetlands',
      authors: ['Jonas Keller'],
      year: 2022,
      doi: '10.1000/sample',
      hasFullText: true,
      abstract: 'Climate notes',
    });
    expect(matchesPaper(work, parseQuery('title:"machine learning" AND yearPublished>2020').ast!)).toBe(true);
    expect(matchesPaper(work, parseQuery('title:warehouse').ast!)).toBe(false);
    expect(matchesPaper(work, parseQuery('authors:Keller AND NOT title:warehouse').ast!)).toBe(true);
    expect(matchesPaper(work, parseQuery('_exists_:doi').ast!)).toBe(true);
    expect(matchesPaper(paper({ title: 'No identifier' }), parseQuery('_exists_:doi').ast!)).toBe(false);
    expect(matchesPaper(work, parseQuery('yearPublished<=2019').ast!)).toBe(false);
  });

  it('treats a space as AND and highlights only positive terms', () => {
    const parsed = parseQuery('drone package');
    expect(parsed.valid).toBe(true);
    expect(matchesPaper(paper({ title: 'drone' }), parsed.ast!)).toBe(false);
    expect(matchesPaper(paper({ title: 'drone package' }), parsed.ast!)).toBe(true);
    expect(positiveTerms(parseQuery('drone AND NOT warehouse').ast)).toEqual(['drone']);
  });

  it('flags a missing quote and inserts builder clauses', () => {
    expect(parseQuery('title:"machine learning').valid).toBe(false);
    expect(insertClause('drone', 'package')).toBe('drone AND package');
    expect(insertClause('(drone', 'OR')).toBe('(drone OR');
    expect(insertClause('', 'title:"climate"')).toBe('title:"climate"');
  });
});
