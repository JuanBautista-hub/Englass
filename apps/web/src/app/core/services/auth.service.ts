import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable} from 'rxjs';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  email: string;
  role: 'STUDENT' | 'PROFESSOR';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  me(): Observable<AuthUser | null> {
    return this.http.get<AuthUser>(`${environment.apiBaseUrl}/auth/me`).pipe(
      catchError(() => of(null)),
    );
  }
}