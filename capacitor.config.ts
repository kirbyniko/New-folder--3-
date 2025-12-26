import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.civitron.app',
  appName: 'Civitron',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // Don't intercept API calls - let them go to the actual server
    allowNavigation: [
      'https://40c0eb33.civitracker.pages.dev/*'
    ]
  }
};

export default config;
