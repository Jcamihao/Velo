import { Injectable, computed, signal } from '@angular/core';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly storage = globalThis.localStorage;
  private readonly dismissKey = 'triluga.installPromptDismissed';
  private readonly deferredPromptSignal =
    signal<BeforeInstallPromptEvent | null>(null);
  private readonly dismissedSignal = signal(
    this.storage.getItem(this.dismissKey) === '1',
  );
  private readonly standaloneSignal = signal(this.detectStandalone());
  private readonly mobileSignal = signal(this.detectMobileBrowser());

  readonly canPromptInstall = computed(
    () =>
      !!this.deferredPromptSignal() &&
      !this.dismissedSignal() &&
      !this.standaloneSignal(),
  );

  readonly showIosInstallHint = computed(
    () =>
      !this.canPromptInstall() &&
      !this.dismissedSignal() &&
      !this.standaloneSignal() &&
      this.isIosSafari(),
  );

  readonly showAndroidInstallHint = computed(
    () =>
      !this.canPromptInstall() &&
      !this.dismissedSignal() &&
      !this.standaloneSignal() &&
      !this.showIosInstallHint() &&
      this.isAndroidBrowser(),
  );

  readonly showGenericInstallHint = computed(
    () =>
      !this.canPromptInstall() &&
      !this.dismissedSignal() &&
      !this.standaloneSignal() &&
      !this.showIosInstallHint() &&
      !this.showAndroidInstallHint() &&
      this.mobileSignal(),
  );

  readonly canShowBanner = computed(
    () =>
      this.canPromptInstall() ||
      this.showIosInstallHint() ||
      this.showAndroidInstallHint() ||
      this.showGenericInstallHint(),
  );

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    const handleDisplayModeChange = () => {
      this.standaloneSignal.set(this.detectStandalone());
    };

    const handleViewportChange = () => {
      this.mobileSignal.set(this.detectMobileBrowser());
    };

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPromptSignal.set(event as BeforeInstallPromptEvent);
      handleDisplayModeChange();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPromptSignal.set(null);
      this.dismissedSignal.set(false);
      this.storage.removeItem(this.dismissKey);
      this.standaloneSignal.set(true);
    });

    if (globalThis.matchMedia) {
      const mediaQuery = globalThis.matchMedia('(display-mode: standalone)');
      const legacyMediaQuery = mediaQuery as MediaQueryList & {
        addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      };

      if ('addEventListener' in mediaQuery) {
        mediaQuery.addEventListener('change', handleDisplayModeChange);
      } else if (legacyMediaQuery.addListener) {
        legacyMediaQuery.addListener(handleDisplayModeChange);
      }
    }

    window.addEventListener('resize', handleViewportChange);
  }

  dismissBanner() {
    this.dismissedSignal.set(true);
    this.storage.setItem(this.dismissKey, '1');
  }

  async promptInstall() {
    const deferredPrompt = this.deferredPromptSignal();

    if (!deferredPrompt) {
      return false;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      this.deferredPromptSignal.set(null);
      this.dismissedSignal.set(false);
      this.storage.removeItem(this.dismissKey);
      return true;
    }

    this.dismissBanner();
    return false;
  }

  private detectStandalone() {
    const navigatorRef = globalThis.navigator as NavigatorWithStandalone;

    return (
      globalThis.matchMedia?.('(display-mode: standalone)').matches === true ||
      navigatorRef.standalone === true
    );
  }

  private isIosSafari() {
    const userAgent = globalThis.navigator?.userAgent?.toLowerCase() ?? '';
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios/.test(userAgent);

    return isIos && isSafari;
  }

  private isAndroidBrowser() {
    const userAgent = globalThis.navigator?.userAgent?.toLowerCase() ?? '';

    return /android/.test(userAgent);
  }

  private detectMobileBrowser() {
    const userAgent = globalThis.navigator?.userAgent?.toLowerCase() ?? '';
    const isTouchDevice =
      globalThis.matchMedia?.('(pointer: coarse)').matches === true;

    return (
      /android|iphone|ipad|ipod|mobile/.test(userAgent) ||
      isTouchDevice ||
      globalThis.innerWidth <= 1024
    );
  }
}
