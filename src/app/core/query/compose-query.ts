import { Facet } from '../models/paper';

export function composeQuery(
  query: string,
  facet: Facet | null,
  yearFrom: number | null = null,
  yearTo: number | null = null,
): string {
  const parts = [`(${query.trim()})`];
  if (yearFrom !== null) {
    parts.push(`yearPublished>=${yearFrom}`);
  }
  if (yearTo !== null) {
    parts.push(`yearPublished<=${yearTo}`);
  }
  if (facet) {
    parts.push(facetClause(facet));
  }
  return parts.join(' AND ');
}

function facetClause(facet: Facet): string {
  const value = facet.value.replace(/"/g, '').trim();
  switch (facet.kind) {
    case 'year':
      return `yearPublished:${value}`;
    case 'publisher':
      return `publisher:"${value}"`;
    case 'documentType':
      return `documentType:"${value}"`;
    case 'language':
      return `language:"${value}"`;
    case 'author':
      return `authors:"${value}"`;
    case 'topic':
      return `fieldOfStudy:"${value}"`;
  }
}

export function facetLabel(facet: Facet): string {
  switch (facet.kind) {
    case 'year':
      return `Year ${facet.value}`;
    case 'publisher':
      return facet.value;
    case 'documentType':
      return facet.value;
    case 'language':
      return facet.value;
    case 'author':
      return facet.value;
    case 'topic':
      return facet.value;
  }
}
