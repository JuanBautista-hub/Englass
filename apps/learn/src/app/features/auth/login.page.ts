import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="card">
      <h2>Sign in</h2>
      <form (submit)="onSubmit($event)">
        <div style="margin-bottom:0.5rem;">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" autocomplete="email" required [(ngModel)]="email" />
        </div>
        <div style="margin-bottom:0.5rem;">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" autocomplete="current-password" required minlength="8" [(ngModel)]="password" />
        </div>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <div class="row">
          <button type="submit" class="primary" [disabled]="loading()">{{ loading() ? 'Signing in…' : 'Sign in' }}</button>
          <button type="button" (click)="onSignup($event)">Create account</button>
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
