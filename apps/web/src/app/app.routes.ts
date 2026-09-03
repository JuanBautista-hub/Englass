import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'editor/demo' },
  {
    path: 'editor',
    loadChildren: () =>
      import('./features/pdf-editor/pdf-editor.routes').then((m) => m.pdfEditorRoutes),
  },
  { path: 'login', loadComponent: () => import('./core/pages/login.page').then((m) => m.LoginPage) },
  { path: '**', redirectTo: 'editor/demo' },
];