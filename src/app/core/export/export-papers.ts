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

export function exportToWordDoc(papers: readonly Paper[], query: string): void {
  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const content = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>PaperLens Research Report</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      margin: 1.0in;
      size: letter;
    }
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #1a221e;
      background-color: #ffffff;
    }
    .header-table {
      width: 100%;
      border-bottom: 2pt solid #84cc16;
      padding-bottom: 12pt;
      margin-bottom: 18pt;
    }
    .brand-title {
      font-size: 24pt;
      font-weight: bold;
      color: #1b4d2e;
      margin: 0;
    }
    .brand-tag {
      font-size: 10pt;
      color: #4d7c0f;
      text-transform: uppercase;
      letter-spacing: 1.5pt;
    }
    .meta-box {
      background-color: #f7fee7;
      border: 1pt solid #d9f99d;
      border-radius: 6pt;
      padding: 10pt 14pt;
      margin-bottom: 20pt;
      font-size: 10pt;
    }
    .paper-entry {
      margin-bottom: 18pt;
      padding-bottom: 14pt;
      border-bottom: 0.5pt solid #e2e8f0;
      page-break-inside: avoid;
    }
    .paper-num {
      color: #65a30d;
      font-weight: bold;
      font-size: 10pt;
    }
    .paper-title {
      font-size: 13pt;
      font-weight: bold;
      color: #0f172a;
      margin: 3pt 0 4pt 0;
    }
    .paper-authors {
      font-style: italic;
      color: #334155;
      margin-bottom: 4pt;
    }
    .paper-meta {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 6pt;
    }
    .paper-abstract {
      font-size: 10pt;
      color: #1e293b;
      line-height: 1.4;
      background-color: #f8fafc;
      padding: 8pt 10pt;
      border-left: 3pt solid #84cc16;
      margin-top: 6pt;
    }
    .footer {
      font-size: 8.5pt;
      color: #94a3b8;
      text-align: center;
      margin-top: 30pt;
      border-top: 1pt solid #e2e8f0;
      padding-top: 8pt;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <div class="brand-title">&#128269; PaperLens</div>
        <div class="brand-tag">Scientific Research &amp; Intelligence Report</div>
      </td>
      <td style="text-align: right; vertical-align: bottom;">
        <span style="font-size: 9pt; color: #64748b;">Generated: ${dateStr}</span>
      </td>
    </tr>
  </table>

  <div class="meta-box">
    <strong>Search Query:</strong> ${escapeWordHtml(query || 'Curated Exploration')}<br/>
    <strong>Total Works Exported:</strong> ${papers.length} publications<br/>
    <strong>Engine:</strong> PaperLens Open Research Search Platform
  </div>

  ${papers.map((p, i) => `
    <div class="paper-entry">
      <div class="paper-num">DOCUMENT #${i + 1}</div>
      <div class="paper-title">${escapeWordHtml(p.title)}</div>
      <div class="paper-authors">${escapeWordHtml(p.authors.join(', ') || 'Unknown Authors')}</div>
      <div class="paper-meta">
        Year: ${p.year ?? 'N/A'} &nbsp;|&nbsp;
        Publisher: ${escapeWordHtml(p.publisher || 'Unknown')} &nbsp;|&nbsp;
        ${p.doi ? `DOI: ${escapeWordHtml(p.doi)} &nbsp;|&nbsp;` : ''}
        ${p.citationCount != null ? `Citations: ${p.citationCount} &nbsp;|&nbsp;` : ''}
        Type: ${escapeWordHtml(p.documentType || 'Article')}
      </div>
      ${p.abstract ? `<div class="paper-abstract"><strong>Abstract:</strong> ${escapeWordHtml(p.abstract)}</div>` : ''}
      ${p.downloadUrl ? `<div style="font-size: 8.5pt; margin-top: 4pt;"><a href="${p.downloadUrl}">Direct PDF Download</a></div>` : ''}
    </div>
  `).join('')}

  <div class="footer">
    Report created with PaperLens &bull; Open Scientific Research Index
  </div>
</body>
</html>`;

  downloadText(`paperlens-report-${slug(query || 'search')}.doc`, content, 'application/msword;charset=utf-8');
}

export function exportToPrintPdf(papers: readonly Paper[], query: string): void {
  const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download and print the PDF report.');
    return;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PaperLens Research Report - ${escapeWordHtml(query || 'Works')}</title>
  <style>
    @page {
      margin: 1.8cm 1.5cm;
      size: A4;
      @bottom-right {
        content: counter(page);
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 1cm;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2.5px solid #84cc16;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-name {
      font-size: 24pt;
      font-weight: 800;
      color: #14532d;
      letter-spacing: -0.02em;
    }
    .brand-tag {
      font-size: 9.5pt;
      color: #4d7c0f;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 600;
    }
    .meta-box {
      background: #f7fee7;
      border: 1px solid #d9f99d;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 9.5pt;
      display: flex;
      justify-content: space-between;
    }
    .paper-entry {
      margin-bottom: 22px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e5e7eb;
      page-break-inside: avoid;
    }
    .paper-badge {
      display: inline-block;
      font-size: 8pt;
      font-weight: 700;
      color: #3f6212;
      background: #ecfccb;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .paper-title {
      font-size: 13pt;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.35;
      margin-bottom: 6px;
    }
    .paper-authors {
      font-size: 9.5pt;
      color: #334155;
      margin-bottom: 6px;
    }
    .paper-pills {
      font-size: 8.5pt;
      color: #64748b;
      margin-bottom: 8px;
    }
    .paper-abstract {
      font-size: 9.5pt;
      color: #334155;
      line-height: 1.5;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 6px;
      border-left: 3px solid #84cc16;
      margin-top: 8px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 8.5pt;
      color: #94a3b8;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #84cc16; color: black; font-weight: bold; border: none; border-radius: 6px; cursor: pointer;">
      Print or Save as PDF
    </button>
  </div>
  <div class="header">
    <div class="brand-logo">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="14" cy="14" r="8" stroke="#65a30d" stroke-width="2.8" />
        <path d="M20 20 L27 27" stroke="#84cc16" stroke-width="2.8" stroke-linecap="round" />
      </svg>
      <div>
        <div class="brand-name">PaperLens</div>
        <div class="brand-tag">Scientific Research Report</div>
      </div>
    </div>
    <div style="font-size: 9pt; color: #64748b; text-align: right;">
      ${dateStr}
    </div>
  </div>

  <div class="meta-box">
    <div><strong>Search Query:</strong> ${escapeWordHtml(query || 'Curated Exploration')}</div>
    <div><strong>Total Works:</strong> ${papers.length}</div>
  </div>

  ${papers.map((p, i) => `
    <div class="paper-entry">
      <div class="paper-badge">Record #${i + 1}</div>
      <div class="paper-title">${escapeWordHtml(p.title)}</div>
      <div class="paper-authors">By ${escapeWordHtml(p.authors.join(', ') || 'Unknown Authors')}</div>
      <div class="paper-pills">
        Year: <strong>${p.year ?? 'N/A'}</strong> &bull;
        Publisher: <strong>${escapeWordHtml(p.publisher || 'Unknown')}</strong>
        ${p.doi ? `&bull; DOI: <strong>${escapeWordHtml(p.doi)}</strong>` : ''}
        ${p.citationCount != null ? `&bull; Citations: <strong>${p.citationCount}</strong>` : ''}
      </div>
      ${p.abstract ? `<div class="paper-abstract"><strong>Abstract:</strong> ${escapeWordHtml(p.abstract)}</div>` : ''}
    </div>
  `).join('')}

  <div class="footer">
    Generated by PaperLens &bull; Open Scientific Research Index
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function escapeWordHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });
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
