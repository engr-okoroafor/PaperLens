import { Paper } from '../models/paper';

export function papersToCsv(papers: readonly Paper[]): string {
  const header = ['id', 'title', 'authors', 'year', 'publisher', 'journal', 'doi', 'language', 'documentType', 'citationCount', 'downloadUrl'];
  const rows = papers.map((paper) =>
    [
      paper.id,
      paper.title,
      paper.authors.join('; '),
      paper.year,
      paper.publisher,
      paper.journal,
      paper.doi,
      paper.language,
      paper.documentType,
      paper.citationCount,
      paper.downloadUrl,
    ].map(cell).join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

export function papersToJson(papers: readonly Paper[]): string {
  return JSON.stringify(papers, null, 2);
}

export function papersToBibtex(papers: readonly Paper[]): string {
  return papers
    .map((paper, index) => {
      const surname = paper.authors[0]?.split(' ').filter(Boolean).pop() ?? 'work';
      const key = `${slug(surname)}${paper.year ?? ''}${index + 1}`;
      return [
        `@article{${key},`,
        `  title = {${brace(paper.title)}},`,
        `  author = {${brace(paper.authors.join(' and '))}},`,
        `  year = {${paper.year ?? ''}},`,
        `  journal = {${brace(paper.journal ?? '')}},`,
        `  publisher = {${brace(paper.publisher ?? '')}},`,
        `  doi = {${brace(paper.doi ?? '')}},`,
        `  url = {${brace(paper.downloadUrl ?? (paper.doi ? `https://doi.org/${paper.doi}` : ''))}}`,
        '}',
      ].join('\n');
    })
    .join('\n\n');
}

export function downloadText(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function cell(value: string | number | null): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function brace(value: string): string {
  return value.replace(/[{}]/g, '');
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'work';
}
