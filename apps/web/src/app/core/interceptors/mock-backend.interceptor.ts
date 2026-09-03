import type {
  HttpEvent,
  HttpInterceptorFn} from '@angular/common/http';
import {
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import type { Observable} from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MockApiService } from '../services/mock-api.service';

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockApi) {
    console.warn('[Engclass][mockBackendInterceptor] pass-through', req.method, req.url);
    return next(req);
  }

  const mock = inject(MockApiService);
  const headers: Record<string, string> = {};
  req.headers.keys().forEach((key) => {
    headers[key] = req.headers.get(key) ?? '';
  });

  const body: unknown = req.body;
  const url = req.urlWithParams ?? req.url;
  console.warn('[Engclass][mockBackendInterceptor] intercepting', req.method, url);

  return mock.handle({ method: req.method, url, body, headers }).pipe(
    map((value) => buildOk(req.url, value, req.responseType)),
    catchError((value) => buildError(req.url, value)),
  );
};

function buildOk<T>(url: string, value: T, responseType: 'json' | 'arraybuffer' | 'blob' | 'text'): HttpResponse<T> {
  if (responseType === 'arraybuffer') {
    return new HttpResponse<T>({ url, status: 200, body: value as T });
  }
  if (responseType === 'blob') {
    return new HttpResponse<T>({ url, status: 200, body: value as T });
  }
  return new HttpResponse<T>({ url, status: 200, body: value });
}

function buildError(url: string, value: unknown): Observable<HttpEvent<never>> {
  if (
    value !== null &&
    typeof value === 'object' &&
    'statusCode' in value &&
    'message' in value &&
    'code' in value
  ) {
    const err = value as { statusCode: number; message: string; code: string; requestId?: string };
    const headers = new HttpHeaders({ 'X-Request-Id': err.requestId ?? '' });
    return throwError(
      () =>
        new HttpErrorResponse({
          url,
          status: err.statusCode,
          statusText: err.code,
          error: err,
          headers,
        }),
    );
  }
  return throwError(() => value);
}