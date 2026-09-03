import { Injectable } from '@angular/core';
import type { Observable} from 'rxjs';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import type { SubmissionPayload } from '@engclass/shared';
import { isErrorEnvelope } from '@engclass/shared';
import { DEMO_PDF_BASE64, DEMO_PDF_BYTES } from './demo-pdf.b64';

export interface MockRequest {
  method: string;
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}

const CSRF_HEADER = 'X-CSRF-Token';

function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

@Injectable({ providedIn: 'root' })
export class MockApiService {
  readonly demoPdfBytes: number = DEMO_PDF_BYTES;
  private readonly submissions = new Map<string, SubmissionPayload>();
  private readonly demoPdfBuffer: ArrayBuffer;

  constructor() {
    this.demoPdfBuffer = decodeBase64ToArrayBuffer(DEMO_PDF_BASE64);
  }

  handle(req: MockRequest): Observable<unknown> {
    if (req.method === 'GET' && req.url.endsWith('/pdfs/templates/demo/file')) {
      return of(this.demoPdfBuffer.slice(0));
    }
    if (req.method === 'POST' && req.url.endsWith('/pdfs/submissions')) {
      return this.saveSubmission(req);
    }
    if (req.method === 'POST' && req.url.endsWith('/pdfs/compile')) {
      return of(new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: 'application/pdf' })).pipe(
        delay(50),
      );
    }
    if (req.method === 'GET' && req.url.endsWith('/auth/me')) {
      return of({ id: 'demo-user', email: 'demo@engclass.local', role: 'STUDENT' }).pipe(delay(20));
    }
    return throwError(() => this.envelope(404, 'NOT_FOUND', `Mock route not found: ${req.method} ${req.url}`));
  }

  private saveSubmission(req: MockRequest): Observable<unknown> {
    if (!req.headers?.[CSRF_HEADER]) {
      return throwError(() =>
        this.envelope(403, 'FORBIDDEN', `Missing ${CSRF_HEADER} header in mock submission`),
      );
    }
    const body = req.body as SubmissionPayload;
    this.submissions.set(body.templateId, body);
    return of({ id: uuid(), ...body, status: body.status ?? 'DRAFT', updatedAt: new Date().toISOString() }).pipe(
      delay(50),
    );
  }

  private envelope(statusCode: number, code: string, message: string): unknown {
    return {
      statusCode,
      message,
      code,
      requestId: `mock-${uuid()}`,
    };
  }
}

export function isMockEnvelope(value: unknown): boolean {
  return isErrorEnvelope(value);
}