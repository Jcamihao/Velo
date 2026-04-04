import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrivacyPreferencesService {
  private readonly storage = globalThis.localStorage;
  private readonly analyticsConsentKey = 'triluga.privacy.analyticsConsent';
  private readonly analyticsConsentSignal = signal<boolean | null>(
    this.readStoredAnalyticsConsent(),
  );

  readonly analyticsConsentGranted = computed(
    () => this.analyticsConsentSignal() === true,
  );
  readonly hasAnsweredAnalyticsChoice = computed(
    () => this.analyticsConsentSignal() !== null,
  );

  setAnalyticsConsent(granted: boolean) {
    this.analyticsConsentSignal.set(granted);
    this.storage.setItem(this.analyticsConsentKey, granted ? 'granted' : 'denied');
  }

  hydrateAnalyticsConsent(granted: boolean | null | undefined) {
    if (granted === null || granted === undefined) {
      return;
    }

    this.setAnalyticsConsent(granted);
  }

  private readStoredAnalyticsConsent() {
    const rawValue = this.storage.getItem(this.analyticsConsentKey);

    if (rawValue === 'granted') {
      return true;
    }

    if (rawValue === 'denied') {
      return false;
    }

    return null;
  }
}
