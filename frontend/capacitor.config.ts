import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.triluga.app',
  appName: 'Triluga',
  webDir: 'dist/frontend',
  ios: {
    contentInset: 'never',
  },
};

export default config;
