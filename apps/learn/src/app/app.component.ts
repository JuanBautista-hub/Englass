import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1rem;background:#1f2937;color:#fff;">
      <a routerLink="/lessons" style="color:#fff;text-decoration:none;font-weight:600;">Engclass Learn</a>
      @if (auth.isAuthenticated()) {
        <button class="primary" (click)="logout()" style="background:#fff;color:#1f2937;border-color:#fff;">Logout</button>
      } @else {
        <a routerLink="/login" style="color:#fff;">Login</a>
      }
    </header>
    <main>
      <router-outlet />
    </main>
  `,
})
export class AppComponent {
  protected readonly auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
    location.assign('/login');
  }
}
