import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AppLoggerService } from './app-logger.service';
import { PrivacyPreferencesService } from './privacy-preferences.service';

@Injectable({ providedIn: 'root' })
export class AnalyticsTrackingService {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(AppLoggerService);
  private readonly privacyPreferencesService = inject(PrivacyPreferencesService);
  private readonly storage = globalThis.localStorage;
  private readonly sessionStorageRef = globalThis.sessionStorage;

  private readonly visitorIdKey = 'triluga.analytics.visitorId';
  private readonly sessionTrackedKey = 'triluga.analytics.sessionTracked';

  trackCurrentSession(path: string) {
    if (!this.privacyPreferencesService.analyticsConsentGranted()) {
      this.logger.debug('analytics', 'visit_skipped_without_consent', { path });
      return;
    }

    if (this.sessionStorageRef.getItem(this.sessionTrackedKey)) {
      return;
    }

    const visitorId = this.getOrCreateVisitorId();

    this.http
      .post(`${environment.apiBaseUrl}/analytics/visits`, {
        visitorId,
        path,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
      })
      .subscribe({
        next: () => {
          this.sessionStorageRef.setItem(this.sessionTrackedKey, '1');
          this.logger.debug('analytics', 'visit_tracked', { path });
        },
        error: (error) => {
          this.logger.warn('analytics', 'visit_track_failed', {
            path,
            message: error?.message ?? 'Erro desconhecido',
          });
        },
      });
  }

  private getOrCreateVisitorId() {
    const existingVisitorId = this.storage.getItem(this.visitorIdKey);

    if (existingVisitorId) {
      return existingVisitorId;
    }

    const visitorId = crypto.randomUUID();
    this.storage.setItem(this.visitorIdKey, visitorId);

    return visitorId;
  }
}
