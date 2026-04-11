import { Component, inject, signal } from '@angular/core';
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
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { CompareTrayComponent } from './shared/components/compare-tray/compare-tray.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, BottomNavComponent, CompareTrayComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  protected readonly pullRefreshThreshold = 88;
  private readonly router = inject(Router);
  private readonly logger = inject(AppLoggerService);
  private readonly analyticsTrackingService = inject(AnalyticsTrackingService);
  private readonly privacyApiService = inject(PrivacyApiService);
  protected readonly pwaInstallService = inject(PwaInstallService);
  protected readonly privacyPreferencesService = inject(PrivacyPreferencesService);
  private readonly routeTraceService = inject(RouteTraceService);
  protected readonly authService = inject(AuthService);
  protected menuOpen = false;
  protected readonly routeStage = signal<'a' | 'b'>('a');
  protected readonly pullDistance = signal(0);
  protected readonly isPullRefreshing = signal(false);
  private pullStartY: number | null = null;
  private pullEligible = false;
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

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.menuOpen = false;
        this.routeStage.set(this.routeStage() === 'a' ? 'b' : 'a');
      });

    if (!this.authService.hasSession()) {
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
    this.router.navigate(['/anunciar-carro']);
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

  protected get showPrivacyBanner() {
    return !this.privacyPreferencesService.hasAnsweredAnalyticsChoice();
  }

  protected get showInstallBanner() {
    return !this.showPrivacyBanner && this.pwaInstallService.canShowBanner();
  }

  protected get shouldOffsetShellForBanners() {
    return this.showBottomNav() && (this.showPrivacyBanner || this.showInstallBanner);
  }

  protected get shouldUseStackedBannerOffset() {
    return false;
  }

  protected get pullDistanceClass() {
    const distance = this.pullDistance();

    if (distance <= 0 || this.isPullRefreshing()) {
      return '';
    }

    const level = Math.min(6, Math.max(1, Math.ceil(distance / 20)));
    return `app-shell--pull-${level}`;
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

  protected get menuTitle() {
    return this.authService.currentUser()?.profile?.fullName?.trim() || 'Triluga';
  }

  protected get showMenuBrand() {
    return !this.authService.currentUser()?.profile?.fullName?.trim();
  }

  protected handlePullStart(event: TouchEvent) {
    if (!this.canUsePullToRefresh()) {
      this.pullStartY = null;
      this.pullEligible = false;
      return;
    }

    this.pullStartY = event.touches[0]?.clientY ?? null;
    this.pullEligible = globalThis.scrollY <= 0;
  }

  protected handlePullMove(event: TouchEvent) {
    if (
      !this.pullEligible ||
      this.pullStartY === null ||
      this.isPullRefreshing()
    ) {
      return;
    }

    const currentY = event.touches[0]?.clientY ?? this.pullStartY;
    const delta = currentY - this.pullStartY;

    if (delta <= 0 || globalThis.scrollY > 0) {
      this.pullDistance.set(0);
      return;
    }

    const softenedDistance = Math.min(116, delta * 0.45);
    this.pullDistance.set(softenedDistance);

    if (softenedDistance > 6) {
      event.preventDefault();
    }
  }

  protected handlePullEnd() {
    if (this.isPullRefreshing()) {
      return;
    }

    if (this.pullDistance() >= this.pullRefreshThreshold) {
      this.isPullRefreshing.set(true);
      this.pullDistance.set(this.pullRefreshThreshold);
      globalThis.setTimeout(() => {
        globalThis.location.reload();
      }, 180);
    } else {
      this.resetPullState();
    }
  }

  protected handlePullCancel() {
    if (!this.isPullRefreshing()) {
      this.resetPullState();
    }
  }

  private resetPullState() {
    this.pullStartY = null;
    this.pullEligible = false;
    this.pullDistance.set(0);
  }

  private canUsePullToRefresh() {
    if (this.menuOpen) {
      return false;
    }

    if (/^\/chat\/[^/]+/.test(this.currentUrl())) {
      return false;
    }

    if (typeof globalThis.matchMedia !== 'function') {
      return false;
    }

    return globalThis.matchMedia('(pointer: coarse)').matches;
  }
}
