import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="bg-white border border-slate-200 rounded-lg p-4">
      <h2 class="text-lg font-semibold text-slate-900 mt-0 mb-3">Sign in</h2>
      <form (submit)="onSubmit($event)">
        <div class="mb-2">
          <label for="email" class="block text-sm text-slate-600 mb-1">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            [(ngModel)]="email"
            class="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div class="mb-2">
          <label for="password" class="block text-sm text-slate-600 mb-1">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            minlength="8"
            [(ngModel)]="password"
            class="w-full px-2.5 py-1.5 rounded-md border border-slate-300 focus:border-slate-500 focus:outline-none"
          />
        </div>
        @if (error()) {
          <p class="text-error text-sm mb-2">{{ error() }}</p>
        }
        <div class="flex items-center gap-2">
          <button
            type="submit"
            class="bg-slate-900 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
            [disabled]="loading()"
          >{{ loading() ? 'Signing in…' : 'Sign in' }}</button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50"
            (click)="onSignup($event)"
          >Create account</button>
        </div>
      </form>
    </section>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected displayName = 'Student';
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await this.run(() => this.auth.login(this.email, this.password));
  }

  async onSignup(event: Event): Promise<void> {
    event.preventDefault();
    await this.run(() => this.auth.signup(this.email, this.password, this.displayName));
  }

  private async run(fn: () => Promise<unknown>): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await fn();
      await this.router.navigateByUrl('/lessons');
    } catch (err: unknown) {
      this.error.set(this.toMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  private toMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return 'unknown_error';
  }
}
