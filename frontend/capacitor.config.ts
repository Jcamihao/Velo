import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.velo.app',
  appName: 'Velo',
  webDir: 'dist/frontend',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
