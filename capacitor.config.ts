import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.duck.app',
  appName: 'duck',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
