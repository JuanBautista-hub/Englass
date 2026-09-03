import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import type { Observable} from 'rxjs';
import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import type { SubmissionPayload } from '@engclass/shared';
import { assertSubmissionPayload, isErrorEnvelope } from '@engclass/shared';
import { environment } from '../../../../environments/environment';

export interface UiError {
  message: string;
  code: string;
  requestId: string;
}

export const MAX_ANNOTATIONS = 500;
export const MAX_PAYLOAD_BYTES = 256 * 1024;

@Injectable({ providedIn: 'root' })
export class PdfEditorService {
  private readonly http = inject(HttpClient);
  readonly hasError = signal<UiError | null>(null);
  readonly isLoading = signal(false);
  readonly lastRequestId = signal<string | null>(null);

  loadTemplate(templateId: string): Promise<ArrayBuffer> {
    this.isLoading.set(true);
    return firstValueFrom(
      this.http
        .get(`${environment.apiBaseUrl}/pdfs/templates/${templateId}/file`, {
          responseType: 'arraybuffer',
        })
        .pipe(map((buf) => buf as ArrayBuffer)),
    ).finally(() => this.isLoading.set(false));
  }

  saveProgress(payload: SubmissionPayload): Observable<unknown> {
    assertSubmissionPayload(payload);
    this.isLoading.set(true);
    return this.http
      .post(`${environment.apiBaseUrl}/pdfs/submissions`, payload)
      .pipe(catchError((err) => this.toEnvelopeError(err)));
  }

  downloadCompiled(payload: SubmissionPayload): Observable<Blob> {
    assertSubmissionPayload(payload);
    this.isLoading.set(true);
    return this.http
      .post(`${environment.apiBaseUrl}/pdfs/compile`, payload, { responseType: 'blob' })
      .pipe(
        map((blob) => blob as Blob),
        catchError((err) => this.toEnvelopeError(err)),
      );
  }

  canAddMore(currentCount: number): boolean {
    return currentCount < MAX_ANNOTATIONS;
  }

  payloadExceedsCap(payload: SubmissionPayload): boolean {
    return JSON.stringify(payload).length > MAX_PAYLOAD_BYTES;
  }

  clearError(): void {
    this.hasError.set(null);
  }

  private toEnvelopeError(err: unknown): Observable<never> {
    this.isLoading.set(false);
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (isErrorEnvelope(body)) {
        const ui: UiError = {
          message: body.message,
          code: body.code,
          requestId: body.requestId,
        };
        this.hasError.set(ui);
        this.lastRequestId.set(body.requestId);
        return throwError(() => ui);
      }
      const fallbackRequestId =
        err.headers.get('X-Request-Id') ?? `unknown-${Date.now().toString(36)}`;
      const fallback: UiError = {
        message: err.message || 'Error de red',
        code: 'INTERNAL',
        requestId: fallbackRequestId,
      };
      this.hasError.set(fallback);
      this.lastRequestId.set(fallbackRequestId);
      return throwError(() => fallback);
    }
    const fallback: UiError = {
      message: 'Error desconocido',
      code: 'INTERNAL',
      requestId: `unknown-${Date.now().toString(36)}`,
    };
    this.hasError.set(fallback);
    return throwError(() => fallback);
  }
}

function firstValueFrom<T>(source: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const sub = source.subscribe({
      next: (value) => {
        resolve(value);
        sub.unsubscribe();
      },
      error: (err) => reject(err),
    });
  });
}