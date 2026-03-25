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
    path: 'bookings/new/:vehicleId',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['RENTER', 'OWNER'] },
    loadComponent: () =>
      import('./features/booking/booking-page.component').then(
        (m) => m.BookingPageComponent,
      ),
  },
  {
    path: 'my-bookings',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['RENTER', 'OWNER'] },
    loadComponent: () =>
      import('./features/my-bookings/my-bookings-page.component').then(
        (m) => m.MyBookingsPageComponent,
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
    canActivate: [authGuard, roleGuard],
    data: { roles: ['OWNER'], view: 'ads' },
    loadComponent: () =>
      import('./features/owner-dashboard/owner-dashboard-page.component').then(
        (m) => m.OwnerDashboardPageComponent,
      ),
  },
  {
    path: 'owner-dashboard',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['OWNER'], view: 'dashboard' },
    loadComponent: () =>
      import('./features/owner-dashboard/owner-dashboard-page.component').then(
        (m) => m.OwnerDashboardPageComponent,
      ),
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
