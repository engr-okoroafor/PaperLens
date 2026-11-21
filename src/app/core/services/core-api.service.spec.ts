import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CoreApiService } from './core-api.service';

describe('CoreApiService', () => {
  let service: CoreApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CoreApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('maps a proxied CORE search response', async () => {
    const pending = service.search('drone', 10, 0, 'yearPublished:desc');
    const request = http.expectOne((candidate) => candidate.url === '/api/core');
    expect(request.request.params.get('q')).toBe('drone');
    expect(request.request.params.get('sort')).toBe('yearPublished:desc');
    request.flush({
      ok: true,
      data: {
        totalHits: 12,
        results: [
          {
            id: 7,
            title: 'Medical drone logistics',
            authors: [{ name: 'Sofia Almeida' }],
            yearPublished: 2024,
            publisher: 'PLOS',
            doi: '10.1/medical',
            downloadUrl: 'https://example.com/medical.pdf',
            language: { name: 'English' },
            documentType: 'research article',
            citationCount: 2,
          },
        ],
      },
    });

    const result = await pending;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.totalHits).toBe(12);
      expect(result.papers[0]?.title).toBe('Medical drone logistics');
      expect(result.papers[0]?.hasFullText).toBe(true);
    }
  });

  it('keeps the proxy message when CORE returns 429', async () => {
    const pending = service.search('drone', 10, 0, null);
    http.expectOne((candidate) => candidate.url === '/api/core').flush(
      { ok: false, code: 'rate_limited', message: 'CORE is rate-limiting this client (429).' },
      { status: 429, statusText: 'Too Many Requests' },
    );
    const result = await pending;
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('rate_limited');
      expect(result.message).toContain('429');
    }
  });
});
