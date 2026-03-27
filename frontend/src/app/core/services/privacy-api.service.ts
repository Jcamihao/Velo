import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  PrivacyCenterOverview,
  PrivacyPolicySummary,
  PrivacyPreferences,
  PrivacyRequestItem,
  PrivacyRequestType,
} from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class PrivacyApiService {
  private readonly http = inject(HttpClient);

  getPolicy() {
    return this.http.get<PrivacyPolicySummary>(
      `${environment.apiBaseUrl}/privacy/policy`,
    );
  }

  getMyPrivacyCenter() {
    return this.http.get<PrivacyCenterOverview>(
      `${environment.apiBaseUrl}/privacy/me`,
    );
  }

  updateMyPreferences(analyticsConsentGranted: boolean) {
    return this.http.patch<PrivacyPreferences>(
      `${environment.apiBaseUrl}/privacy/me/preferences`,
      {
        analyticsConsentGranted,
      },
    );
  }

  listMyRequests() {
    return this.http.get<PrivacyRequestItem[]>(
      `${environment.apiBaseUrl}/privacy/me/requests`,
    );
  }

  createRequest(type: PrivacyRequestType, notes?: string) {
    return this.http.post<PrivacyRequestItem>(
      `${environment.apiBaseUrl}/privacy/me/requests`,
      { type, notes },
    );
  }

  exportMyData() {
    return this.http.get<Record<string, unknown>>(
      `${environment.apiBaseUrl}/privacy/me/export`,
    );
  }
}
