import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MockApiService } from './mock-api.service';
import { DEMO_PDF_BYTES } from './demo-pdf.b64';

describe('MockApiService', () => {
  let service: MockApiService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MockApiService],
    });
    service = TestBed.inject(MockApiService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('bundles the demo PDF and exposes its size', () => {
    expect(service.demoPdfBytes).toBe(DEMO_PDF_BYTES);
    expect(DEMO_PDF_BYTES).toBeGreaterThan(0);
  });

  it('returns the demo fixture bytes starting with %PDF', (done) => {
    service
      .handle({ method: 'GET', url: '/api/v1/pdfs/templates/demo/file' })
      .subscribe((value) => {
        const buffer = value as ArrayBuffer;
        const head = new TextDecoder().decode(new Uint8Array(buffer).slice(0, 4));
        expect(head).toBe('%PDF');
        expect(buffer.byteLength).toBe(DEMO_PDF_BYTES);
        done();
      });
  });

  it('rejects mutating calls without X-CSRF-Token', (done) => {
    service
      .handle({ method: 'POST', url: '/api/v1/pdfs/submissions', body: { templateId: 'demo', answers: [] } })
      .subscribe({
        error: (err) => {
          expect(err.code).toBe('FORBIDDEN');
          done();
        },
      });
  });

  it('accepts mutating calls with X-CSRF-Token', (done) => {
    service
      .handle({
        method: 'POST',
        url: '/api/v1/pdfs/submissions',
        body: { templateId: 'demo', answers: [] },
        headers: { 'X-CSRF-Token': 'abc' },
      })
      .subscribe((value) => {
        expect((value as { id?: string }).id).toBeDefined();
        done();
      });
  });
});