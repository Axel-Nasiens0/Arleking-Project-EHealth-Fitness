import type { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'splash-screen', pathMatch: 'full' },
  {
    path: 'splash-screen',
    loadComponent: () => import('./splash-screen/splash-screen.page').then((m) => m.SplashScreenPage),
  },
  { path: 'login', loadComponent: () => import('./login/login.page').then((m) => m.LoginPage) },
  { path: 'folder', loadComponent: () => import('./folder/folder.page').then((m) => m.FolderPage) },
  {
    path: 'pasos-detalle',
    loadComponent: () => import('./pasos-detalle/pasos-detalle.page').then((m) => m.PasosDetallePage),
  },
  { path: 'metas', loadComponent: () => import('./metas/metas.page').then((m) => m.MetasPage) },
  {
    path: 'sueno',
    loadComponent: () => import('./sueno/sueno.page').then((m) => m.SuenoPage),
  },
];
