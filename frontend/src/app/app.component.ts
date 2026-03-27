import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { AnalyticsTrackingService } from './core/services/analytics-tracking.service';
import { AppLoggerService } from './core/services/app-logger.service';
import { PwaInstallService } from './core/services/pwa-install.service';
import { PrivacyApiService } from './core/services/privacy-api.service';
import { PrivacyPreferencesService } from './core/services/privacy-preferences.service';
import { RouteTraceService } from './core/services/route-trace.service';
import { BottomNavComponent } from './shared/components/bottom-nav.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, BottomNavComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly logger = inject(AppLoggerService);
  private readonly analyticsTrackingService = inject(AnalyticsTrackingService);
  private readonly privacyApiService = inject(PrivacyApiService);
  protected readonly pwaInstallService = inject(PwaInstallService);
  protected readonly privacyPreferencesService = inject(PrivacyPreferencesService);
  private readonly routeTraceService = inject(RouteTraceService);
  protected readonly authService = inject(AuthService);
  protected menuOpen = false;
  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    this.routeTraceService.start();
    this.analyticsTrackingService.trackCurrentSession(
      globalThis.location?.pathname
        ? `${globalThis.location.pathname}${globalThis.location.search}`
        : '/',
    );
    this.logger.info('app', 'bootstrap', {
      authenticated: this.authService.isAuthenticated(),
    });

    if (!this.authService.hasSession()) {
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe(() => (this.menuOpen = false));
      return;
    }

    this.authService.restoreSession().subscribe({
      next: (authenticated) => {
        if (!authenticated || !this.authService.getAccessToken()) {
          return;
        }

        this.authService.loadMe().subscribe({
          error: () => undefined,
        });
      },
      error: () => undefined,
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => (this.menuOpen = false));
  }

  protected toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  protected closeMenu() {
    this.menuOpen = false;
  }

  protected openProfile() {
    this.navigateProtected('/profile');
  }

  protected openBookings() {
    this.navigateProtected('/my-bookings');
  }

  protected openFavorites() {
    this.navigateProtected('/favorites');
  }

  protected openMyAds() {
    const user = this.authService.currentUser();
    const role = this.authService.getSessionRole();

    if (!user && !role) {
      this.closeMenu();
      this.router.navigate(['/auth/login']);
      return;
    }

    this.closeMenu();

    if ((user?.role ?? role) === 'OWNER') {
      this.router.navigate(['/anunciar-carro']);
      return;
    }

    this.router.navigate(['/anunciar']);
  }

  protected openOwnerDashboard() {
    const user = this.authService.currentUser();
    const role = this.authService.getSessionRole();

    if ((user?.role ?? role) !== 'OWNER') {
      this.closeMenu();
      this.router.navigate(['/anunciar']);
      return;
    }

    this.closeMenu();
    this.router.navigate(['/owner-dashboard']);
  }

  protected goToLogin() {
    this.closeMenu();
    this.router.navigate(['/auth/login']);
  }

  protected openPrivacyPolicy() {
    this.closeMenu();
    this.router.navigate(['/privacy']);
  }

  protected openPrivacyCenter() {
    this.closeMenu();

    if (!this.authService.hasSession()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.router.navigate(['/privacy-center']);
  }

  protected setAnalyticsConsent(granted: boolean) {
    this.privacyPreferencesService.setAnalyticsConsent(granted);

    if (this.authService.isAuthenticated()) {
      this.privacyApiService.updateMyPreferences(granted).subscribe({
        error: () => undefined,
      });
    }

    if (granted) {
      this.analyticsTrackingService.trackCurrentSession(
        globalThis.location?.pathname
          ? `${globalThis.location.pathname}${globalThis.location.search}`
          : '/',
      );
    }
  }

  protected async installApp() {
    await this.pwaInstallService.promptInstall();
  }

  protected dismissInstallBanner() {
    this.pwaInstallService.dismissBanner();
  }

  readonly showBottomNav = () => {
    const url = this.currentUrl();

    if (url.startsWith('/auth')) {
      return false;
    }

    if (/^\/chat\/[^/]+/.test(url)) {
      return false;
    }

    return true;
  };

  private navigateProtected(path: string) {
    this.closeMenu();

    if (!this.authService.hasSession()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.router.navigate([path]);
  }

  protected get menuAvatarInitials() {
    const fullName = this.authService.currentUser()?.profile?.fullName?.trim();

    if (!fullName) {
      return 'IC';
    }

    return fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected get menuAvatarAlt() {
    const fullName = this.authService.currentUser()?.profile?.fullName?.trim();
    return fullName ? `Foto de perfil de ${fullName}` : 'Foto de perfil';
  }

  protected get isOwnerSession() {
    return (this.authService.currentUser()?.role ?? this.authService.getSessionRole()) === 'OWNER';
  }
}
