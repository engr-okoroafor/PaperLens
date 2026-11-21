import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { normalizeAggregates, normalizeSearchBody } from '../api/normalize';
import { AggregateOutcome, SearchFailure, SearchOutcome } from '../models/paper';

interface ProxyFailure {
  ok: false;
  code?: SearchFailure['code'];
  message?: string;
  status?: number;
}

interface ProxySuccess {
  ok: true;
  data?: unknown;
}

@Injectable({ providedIn: 'root' })
export class CoreApiService {
  private readonly http = inject(HttpClient);

  search(query: string, limit: number, offset: number, sort: string | null): Promise<SearchOutcome> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', String(limit))
      .set('offset', String(offset));
    if (sort) {
      params = params.set('sort', sort);
    }
    return this.send<SearchOutcome>(() => this.http.get<ProxySuccess>('/api/core', { params }), (body) => {
      const parsed = normalizeSearchBody(body.data);
      return { ok: true, papers: parsed.papers, totalHits: parsed.totalHits };
    });
  }

  aggregate(query: string): Promise<AggregateOutcome> {
    return this.send<AggregateOutcome>(
      () =>
        this.http.post<ProxySuccess>('/api/core', {
          q: query,
          aggregations: [
            'yearPublished',
            'publisher',
            'documentType',
            'language',
            'authors',
            'fieldOfStudy',
          ],
        }),
      (body) => {
        const aggregates = normalizeAggregates(body.data);
        if (!aggregates) {
          return { ok: false, message: 'CORE returned a search total without aggregation buckets.' };
        }
        return { ok: true, aggregates };
      },
    );
  }

  private async send<T>(
    request: () => ReturnType<HttpClient['get']>,
    mapSuccess: (body: ProxySuccess) => T,
  ): Promise<T> {
    try {
      const body = (await firstValueFrom(request())) as ProxySuccess;
      if (!body?.ok) {
        return this.failure('upstream', 'The CORE proxy returned an unexpected payload.', null) as T;
      }
      return mapSuccess(body);
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        const payload = (error.error ?? {}) as ProxyFailure;
        const code = payload.code ?? (error.status === 429 ? 'rate_limited' : error.status === 401 ? 'unauthorized' : 'upstream');
        return this.failure(code, payload.message ?? this.fallbackMessage(code), error.status) as T;
      }
      return this.failure('network', 'PaperLens could not reach the CORE proxy.', null) as T;
    }
  }

  private failure(code: SearchFailure['code'], message: string, status: number | null): SearchFailure {
    return { ok: false, code, message, status };
  }

  private fallbackMessage(code: SearchFailure['code']): string {
    if (code === 'rate_limited') {
      return 'CORE is rate-limiting requests. PaperLens retried with backoff, then stopped so it would not hammer the API.';
    }
    if (code === 'unauthorized') {
      return 'CORE rejected the server-side API key. Check CORE_API_KEY, or unset it to use the public limit.';
    }
    return 'CORE did not return a usable response.';
  }
}
