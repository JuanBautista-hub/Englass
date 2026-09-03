import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'engclass-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto max-w-md p-8">
      <h1 class="text-2xl font-semibold">Inicia sesión</h1>
      <p class="mt-4 text-sm text-slate-600">
        Engclass Fase 1 usa autenticación por cookies httpOnly. Esta pantalla es un placeholder
        hasta que aterrice el backend (cambio <code class="font-mono">add-real-auth</code>).
      </p>
    </main>
  `,
})
export class LoginPage {}