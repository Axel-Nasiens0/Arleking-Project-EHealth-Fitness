import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash-screen',
    pathMatch: 'full',
  },
  {
    path: 'folder',
    loadComponent: () => import('./folder/folder.page').then((m) => m.FolderPage),
  },
  {
    path: 'splash-screen',
    loadComponent: () => import('./splash-screen/splash-screen.page').then((m) => m.SplashScreenPage),
  },
  {
    path: 'pasos-detalle',
    loadComponent: () => import('./pasos-detalle/pasos-detalle.page').then((m) => m.PasosDetallePage),
  },
];
