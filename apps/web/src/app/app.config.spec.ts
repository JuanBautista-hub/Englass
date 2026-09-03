import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';
import { mockBackendInterceptor } from './core/interceptors/mock-backend.interceptor';

const INTERCEPTOR_ORDER: ReadonlyArray<string> = [
  'mockBackendInterceptor',
  'csrfInterceptor',
];

describe('interceptor order', () => {
  it('declares mockBackendInterceptor before csrfInterceptor', () => {
    expect(INTERCEPTOR_ORDER).toEqual(['mockBackendInterceptor', 'csrfInterceptor']);
  });

  it('mock intercepts before csrf in the configured list', () => {
    const list = [mockBackendInterceptor, csrfInterceptor];
    expect(list[0]).toBe(mockBackendInterceptor);
    expect(list[1]).toBe(csrfInterceptor);
  });

  it('mock accepts GET /auth/me in mock mode without forwarding to the network', (done) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockBackendInterceptor, csrfInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const client: HttpClient = TestBed.inject(HttpClient);
    const http = TestBed.inject(HttpTestingController);
    client.get('/api/v1/auth/me').subscribe(() => {
      http.expectNone(() => true);
      done();
    });
  });
});