import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ge.smartpick.app',
  appName: 'SmartPick',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false, // Disable for production/better emulator performance
    allowNavigation: ['https://*'] // Restrict to HTTPS only
  },
  android: {
    allowMixedContent: false, // Disable for security
    captureInput: true,
    webContentsDebuggingEnabled: false // Disable to prevent cache issues
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
    },
    Geolocation: {
      permissions: ['location'],
      accuracy: 'high'
    }
  }
};

export default config;
