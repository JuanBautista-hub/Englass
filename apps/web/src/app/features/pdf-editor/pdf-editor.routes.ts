import type { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const pdfEditorRoutes: Routes = [
  {
    path: ':templateId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pdf-editor.page').then((m) => m.PdfEditorPage),
  },
];