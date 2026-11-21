import { Paper } from '../models/paper';

export type SortKey = 'relevance' | 'year_desc' | 'year_asc';

export function sortPapers(papers: readonly Paper[], sort: SortKey): Paper[] {
  if (sort === 'relevance') {
    return [...papers];
  }
  const direction = sort === 'year_asc' ? 1 : -1;
  return [...papers].sort((left, right) => ((left.year ?? -1) - (right.year ?? -1)) * direction);
}
