import { logger } from '@/lib/logger';
/**
 * Firebase Configuration
 * Initializes Firebase for web and manages FCM tokens in Firestore
 * Region: europe-west1 (Belgium) - optimized for Georgia
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase config from environment variables
// ⚠️ SECURITY: API keys are restricted in Google Cloud Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Use european region for Cloud Functions (closer to Georgia)
export const functions = getFunctions(app, 'europe-west1');

export const messaging = typeof window !== 'undefined' && 'Notification' in window 
  ? getMessaging(app) 
  : null;

/**
 * Request FCM token and save to Firestore
 */
export async function requestFCMToken(userId: string): Promise<string | null> {
  if (!messaging) {
    logger.warn('Firebase Messaging not supported');
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      logger.debug('Notification permission denied');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY
    });

    if (!token) {
      logger.warn('No FCM token received');
      return null;
    }

    logger.debug('FCM token received:', token.substring(0, 20) + '...');
    return token;

  } catch (error) {
    logger.error('FCM token request failed:', error);
    return null;
  }
}

/**
 * Listen for foreground FCM messages
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) {
    logger.warn('Firebase Messaging not supported');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    logger.debug('Foreground FCM message:', payload);
    callback(payload);
  });
}

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  logger.debug('Connected to Firebase emulators');
}
