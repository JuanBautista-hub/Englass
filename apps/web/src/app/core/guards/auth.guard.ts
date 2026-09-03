import type { CanActivateFn, UrlTree } from '@angular/router';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  console.warn('[Engclass][authGuard] firing, useMockApi=', environment.useMockApi);
  return auth.me().pipe(
    map((user) => {
      console.warn('[Engclass][authGuard] me() resolved with', user);
      return user ? true : (router.createUrlTree(['/login']) as UrlTree);
    }),
  );
};