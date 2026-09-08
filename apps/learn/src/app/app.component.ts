import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { DashboardService } from './core/services/dashboard.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <header class="flex items-center justify-between bg-slate-900 text-white px-4 py-3">
      <div class="flex items-center gap-3">
        <a routerLink="/dashboard" class="text-white font-semibold no-underline">Engclass Learn</a>
        <nav class="flex items-center gap-2 text-sm" aria-label="Primary">
          <a routerLink="/dashboard" class="text-slate-200 hover:text-white no-underline px-2 py-1 rounded">Dashboard</a>
          <a routerLink="/lessons" class="text-slate-200 hover:text-white no-underline px-2 py-1 rounded">Lessons</a>
        </nav>
      </div>
      <div class="flex items-center gap-3">
        @if (auth.isAuthenticated() && streak() !== null) {
          <span class="flex items-center gap-1 text-sm" aria-label="Current streak">
            <span aria-hidden="true">🔥</span>
            <span class="font-semibold">{{ streak() }}</span>
          </span>
        }
        @if (auth.isAuthenticated()) {
          <button
            type="button"
            class="bg-white text-slate-900 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            (click)="logout()"
          >Logout</button>
        } @else {
          <a routerLink="/login" class="text-white">Login</a>
        }
      </div>
    </header>
    <main class="max-w-3xl mx-auto px-4 py-4">
      <router-outlet />
    </main>
  `,
})
export class AppComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);

  protected readonly streak = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    try {
      const d = await this.dashboard.get();
      this.streak.set(d.currentStreak);
    } catch {
      // ignore
    }
  }

  logout(): void {
    this.auth.logout();
    location.assign('/login');
  }
}
