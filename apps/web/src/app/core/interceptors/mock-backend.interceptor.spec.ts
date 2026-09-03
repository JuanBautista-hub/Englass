import { TestBed } from '@angular/core/testing';
import type {
  HttpErrorResponse} from '@angular/common/http';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { mockBackendInterceptor } from './mock-backend.interceptor';
import { environment } from '../../../environments/environment';

describe('mockBackendInterceptor', () => {
  let http: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([mockBackendInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
  });

  const itWhenMockOff = environment.useMockApi ? it.skip : it;
  const itWhenMockOn = environment.useMockApi ? it : it.skip;

  itWhenMockOff('is a pass-through when useMockApi is false', () => {
    http.get('/api/v1/auth/me').subscribe({
      next: () => fail('should not resolve from the mock'),
      error: (err: HttpErrorResponse) => {
        expect(err.status).toBe(404);
      },
    });
    const controller = TestBed.inject(HttpTestingController);
    const req = controller.expectOne('/api/v1/auth/me');
    req.flush('not found', { status: 404, statusText: 'Not Found' });
  });

  itWhenMockOn('intercepts GET /auth/me when useMockApi is true', () => {
    http.get('/api/v1/auth/me').subscribe((value: unknown) => {
      expect(value).toMatchObject({ id: 'demo-user' });
    });
    const controller = TestBed.inject(HttpTestingController);
    controller.expectNone(() => true);
  });
});