import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';
import { mockBackendInterceptor } from './core/interceptors/mock-backend.interceptor';
import { environment } from '../environments/environment';

if (environment.useMockApi) {
  console.warn('[Engclass] Mock API is active - no real backend is being called.');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([mockBackendInterceptor, csrfInterceptor])),
    provideAnimations(),
  ],
};