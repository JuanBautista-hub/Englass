import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { csrfInterceptor } from './csrf.interceptor';

function setCsrfCookie(value: string | null): void {
  if (value === null) {
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  } else {
    document.cookie = `csrf_token=${encodeURIComponent(value)}; path=/`;
  }
}

describe('csrfInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    setCsrfCookie(null);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([csrfInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    setCsrfCookie(null);
    controller.verify();
  });

  it('adds X-CSRF-Token to POST requests when cookie is present', () => {
    setCsrfCookie('abc-123');
    http.post('/api/v1/pdfs/submissions', {}).subscribe();
    const req = controller.expectOne('/api/v1/pdfs/submissions');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('abc-123');
    req.flush({});
  });

  it('adds X-CSRF-Token to PUT, PATCH, DELETE', () => {
    setCsrfCookie('zzz');
    http.put('/api/v1/foo', {}).subscribe();
    http.patch('/api/v1/foo', {}).subscribe();
    http.delete('/api/v1/foo').subscribe();

    const put = controller.expectOne({ method: 'PUT' });
    expect(put.request.headers.get('X-CSRF-Token')).toBe('zzz');
    put.flush({});

    const patch = controller.expectOne({ method: 'PATCH' });
    expect(patch.request.headers.get('X-CSRF-Token')).toBe('zzz');
    patch.flush({});

    const del = controller.expectOne({ method: 'DELETE' });
    expect(del.request.headers.get('X-CSRF-Token')).toBe('zzz');
    del.flush({});
  });

  it('does not add X-CSRF-Token to GET', () => {
    setCsrfCookie('zzz');
    http.get('/api/v1/pdfs/templates/demo/file').subscribe();
    const req = controller.expectOne('/api/v1/pdfs/templates/demo/file');
    expect(req.request.headers.has('X-CSRF-Token')).toBe(false);
    req.flush({});
  });

  it('is a no-op when the csrf_token cookie is missing', () => {
    http.post('/api/v1/pdfs/submissions', {}).subscribe();
    const req = controller.expectOne('/api/v1/pdfs/submissions');
    expect(req.request.headers.has('X-CSRF-Token')).toBe(false);
    req.flush({});
  });
});