import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home-page.component').then(
        (m) => m.HomePageComponent,
      ),
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./features/search/search-page.component').then(
        (m) => m.SearchPageComponent,
      ),
  },
  {
    path: 'anunciar',
    loadComponent: () =>
      import('./features/host/host-page.component').then(
        (m) => m.HostPageComponent,
      ),
  },
  {
    path: 'chat/:conversationId',
    loadComponent: () =>
      import('./features/chat/chat-page.component').then(
        (m) => m.ChatPageComponent,
      ),
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./features/chat/chat-page.component').then(
        (m) => m.ChatPageComponent,
      ),
  },
  {
    path: 'vehicles/:id',
    loadComponent: () =>
      import('./features/vehicle/vehicle-detail-page.component').then(
        (m) => m.VehicleDetailPageComponent,
      ),
  },
  {
    path: 'compare',
    loadComponent: () =>
      import('./features/compare/compare-page.component').then(
        (m) => m.ComparePageComponent,
      ),
  },
  {
    path: 'bookings/new/:vehicleId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/booking/booking-page.component').then(
        (m) => m.BookingPageComponent,
      ),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile-page.component').then(
        (m) => m.ProfilePageComponent,
      ),
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./features/privacy/privacy-page.component').then(
        (m) => m.PrivacyPageComponent,
      ),
  },
  {
    path: 'privacy-center',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/privacy/privacy-center-page.component').then(
        (m) => m.PrivacyCenterPageComponent,
      ),
  },
  {
    path: 'users/:id',
    loadComponent: () =>
      import('./features/user-profile/user-profile-page.component').then(
        (m) => m.UserProfilePageComponent,
      ),
  },
  {
    path: 'favorites',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/favorites/favorites-page.component').then(
        (m) => m.FavoritesPageComponent,
      ),
  },
  {
    path: 'anunciar-carro',
    canActivate: [authGuard],
    data: { view: 'ads' },
    loadComponent: () =>
      import('./features/owner-dashboard/owner-dashboard-page.component').then(
        (m) => m.OwnerDashboardPageComponent,
      ),
  },
  {
    path: 'owner-dashboard',
    redirectTo: 'anunciar-carro',
    pathMatch: 'full',
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () =>
      import('./features/admin/admin-page.component').then(
        (m) => m.AdminPageComponent,
      ),
  },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login-page.component').then(
        (m) => m.LoginPageComponent,
      ),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./features/auth/register-page.component').then(
        (m) => m.RegisterPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
