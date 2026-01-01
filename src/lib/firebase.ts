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

// Firebase config from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyCi4S2B_BgrnmCArm9i-j6vquJtWGjNDTY",
  projectId: "smartpick-app",
  storageBucket: "smartpick-app.firebasestorage.app",
  messagingSenderId: "1041329500996",
  appId: "1:1041329500996:android:609c24107dae65288b1d11"
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
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 
        'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xQmrEcEzAYNUUvdtHNEjY4zKUiQJJq1XUj5U0wSk8G6q1QrR7RpBk'
    });

    logger.debug('FCM token obtained:', token);

    // Save to Firestore
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'fcm_tokens', userId), {
      token,
      userId,
      platform: 'web',
      updatedAt: new Date()
    }, { merge: true });

    return token;
  } catch (error) {
    logger.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return;
  
  return onMessage(messaging, (payload) => {
    logger.debug('Foreground message received:', payload);
    callback(payload);
  });
}
