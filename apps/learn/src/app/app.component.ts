import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="flex items-center justify-between bg-slate-900 text-white px-4 py-3">
      <a routerLink="/lessons" class="text-white font-semibold no-underline">Engclass Learn</a>
      @if (auth.isAuthenticated()) {
        <button
          type="button"
          class="bg-white text-slate-900 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-100"
          (click)="logout()"
        >Logout</button>
      } @else {
        <a routerLink="/login" class="text-white">Login</a>
      }
    </header>
    <main class="max-w-3xl mx-auto px-4 py-4">
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
