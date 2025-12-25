import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ge.smartpick.app',
  appName: 'SmartPick',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true, // Allow HTTP for development
    allowNavigation: ['*']
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3b82f6',
      showSpinner: false
    },
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
