import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/explore/explore').then((module) => module.Explore),
    title: 'PaperLens',
  },
];
