import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PdfEditorService, MAX_ANNOTATIONS } from './pdf-editor.service';
import type { SubmissionPayload } from '@engclass/shared';

const SUBMIT_URL = 'http://localhost:3000/api/v1/pdfs/submissions';

const VALID_PAYLOAD: SubmissionPayload = {
  templateId: 'demo',
  answers: [
    {
      id: 'a-1',
      pageIndex: 0,
      x: 100,
      y: 200,
      text: 'hola',
      fontSize: 12,
    },
  ],
};

describe('PdfEditorService', () => {
  let service: PdfEditorService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PdfEditorService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
    service.clearError();
  });

  it('sends a valid payload to /api/v1/pdfs/submissions', () => {
    let completed = false;
    service.saveProgress(VALID_PAYLOAD).subscribe({ complete: () => (completed = true) });
    const req = controller.expectOne(SUBMIT_URL);
    expect(req.request.method).toBe('POST');
    req.flush({});
    expect(completed).toBe(true);
  });

  it('short-circuits with SharedValidationError when payload is invalid', () => {
    const bad = { ...VALID_PAYLOAD, answers: [{ ...VALID_PAYLOAD.answers[0], text: 'bad\u0000' }] };
    let error: unknown = null;
    try {
      service.saveProgress(bad as SubmissionPayload).subscribe();
    } catch (e) {
      error = e;
    }
    expect(error).toBeTruthy();
    controller.expectNone(() => true);
  });

  it('surfaces a non-envelope 4xx response with X-Request-Id fallback', () => {
    service.saveProgress(VALID_PAYLOAD).subscribe({
      error: () => undefined,
    });
    const req = controller.expectOne(SUBMIT_URL);
    req.flush('not-json', { status: 500, statusText: 'Server Error', headers: { 'X-Request-Id': 'srv-1' } });
    expect(service.hasError()?.requestId).toBe('srv-1');
    expect(service.hasError()?.code).toBe('INTERNAL');
  });

  it('surfaces a 4xx envelope as a UiError with requestId', () => {
    service.saveProgress(VALID_PAYLOAD).subscribe({ error: () => undefined });
    const req = controller.expectOne(SUBMIT_URL);
    req.flush(
      { statusCode: 400, message: 'bad input', code: 'VALIDATION', requestId: 'req-42' },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(service.hasError()?.requestId).toBe('req-42');
    expect(service.hasError()?.code).toBe('VALIDATION');
  });

  it('enforces the 500-annotation cap', () => {
    expect(service.canAddMore(MAX_ANNOTATIONS - 1)).toBe(true);
    expect(service.canAddMore(MAX_ANNOTATIONS)).toBe(false);
  });

  it('enforces the 256 KB payload cap', () => {
    expect(service.payloadExceedsCap(VALID_PAYLOAD)).toBe(false);
    const baseAnnotation = VALID_PAYLOAD.answers[0]!;
    const huge: SubmissionPayload = {
      templateId: 'demo',
      answers: Array.from({ length: 2000 }, (_, i) => ({
        id: `x-${i}`,
        pageIndex: baseAnnotation.pageIndex,
        x: baseAnnotation.x,
        y: baseAnnotation.y,
        text: 'a'.repeat(200),
        fontSize: baseAnnotation.fontSize,
      })),
    };
    expect(service.payloadExceedsCap(huge)).toBe(true);
  });
});