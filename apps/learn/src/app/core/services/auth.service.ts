import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, AuthUser } from '../models';

const STORAGE_KEY = 'engclass.learn.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly userSig = signal<AuthUser | null>(null);

  readonly user = this.userSig.asReadonly();
  readonly isAuthenticated = computed(() => this.userSig() !== null);

  constructor() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthResponse;
        this.userSig.set(parsed.user);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  getToken(): string | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return (JSON.parse(raw) as AuthResponse).accessToken;
    } catch {
      return null;
    }
  }

  async signup(email: string, password: string, displayName: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/signup`, {
        email,
        password,
        displayName,
      }),
    );
    this.persist(res);
  }

  async login(email: string, password: string): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, { email, password }),
    );
    this.persist(res);
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.userSig.set(null);
  }

  private persist(res: AuthResponse): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(res));
    this.userSig.set(res.user);
  }
}
