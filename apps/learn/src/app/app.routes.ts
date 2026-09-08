import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const APP_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'lessons' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'lessons',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lessons/lessons.page').then((m) => m.LessonsPage),
  },
  {
    path: 'lessons/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lessons/lesson-detail.page').then((m) => m.LessonDetailPage),
  },
  {
    path: 'study/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/study/study.page').then((m) => m.StudyPage),
  },
  { path: '**', redirectTo: 'lessons' },
];
