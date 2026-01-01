import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { requestFCMToken } from '@/lib/firebase';
import { doc, getDocFromCache, getDocFromServer, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function usePushNotifications() {
  logger.debug('[usePushNotifications] Hook initialized');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const fcmTokenRef = useRef<string | null>(null);

  useEffect(() => {
    fcmTokenRef.current = fcmToken;
  }, [fcmToken]);

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`)), timeoutMs)
      )
    ]);
  };

  useEffect(() => {
    logger.debug('[usePushNotifications] useEffect started');
    const platform = Capacitor.getPlatform();
    logger.debug('[usePushNotifications] Platform:', platform, 'isNative:', Capacitor.isNativePlatform());
    
    if (Capacitor.isNativePlatform()) {
      logger.debug('[usePushNotifications] Entering native block');
      // Native mobile - use FCM
      initializeNativePush();
      // DON'T auto-request permission - wait for user to login and manually trigger
    } else {
      // Web - use existing Web Push
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
      checkExistingSubscription();
    }
  }, []);

  // NOTE: Token saving is intentionally triggered only AFTER login (via explicit userId)
  // to avoid "Auth session missing" errors and to make the flow deterministic.

  const requestInitialPermission = async () => {
    try {
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        const result = await PushNotifications.requestPermissions();
        
        if (result.receive === 'granted') {
          await PushNotifications.register();
        }
      } else if (permStatus.receive === 'granted') {
        await PushNotifications.register();
      }
    } catch (error) {
      logger.error('Failed to request initial permission', error);
    }
  };

  const initializeNativePush = async () => {
    try {
      logger.debug('[usePushNotifications] initializeNativePush started');
      // Register for push notifications
      await PushNotifications.addListener('registration', (token) => {
        logger.debug('[usePushNotifications] FCM TOKEN received:', token.value.substring(0, 30) + '...');
        setFcmToken(token.value);
        // Do NOT save here — user might not be logged in yet.
      });

      // Listen for push notification received
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        logger.log('Push notification received:', notification);
        // Show in-app notification
      });

      // Listen for push notification action
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        logger.log('Push notification action:', notification);
        // Handle notification tap
      });

      // Listen for registration errors
      await PushNotifications.addListener('registrationError', (error: any) => {
        logger.error('FCM Registration error:', error);
      });

      // Check permission status
      const permStatus = await PushNotifications.checkPermissions();
      logger.debug('[usePushNotifications] Permission status:', permStatus.receive);
      
      if (permStatus.receive === 'granted') {
        logger.debug('[usePushNotifications] Calling PushNotifications.register()');
        await PushNotifications.register();
        logger.debug('[usePushNotifications] Register completed');
      }
    } catch (error) {
      logger.error('[usePushNotifications] initializeNativePush error:', error);
      logger.error('Failed to initialize native push', error);
    }
  };

  const checkExistingSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
      }
    } catch (error) {
      logger.error('Failed to check push subscription', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      if (Capacitor.isNativePlatform()) {
        // Native mobile - use Capacitor
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive === 'granted') {
          await PushNotifications.register();
          return true;
        }
        return false;
      } else {
        // Web - use existing Web Push
        if (!('Notification' in window)) {
          logger.warn('Push notifications not supported');
          return false;
        }

        const result = await Notification.requestPermission();
        setPermission(result);
        
        return result === 'granted';
      }
    } catch (error) {
      logger.error('Failed to request notification permission', error);
      return false;
    }
  };

  const saveFCMToken = async (token: string) => {
    try {
      logger.debug('[usePushNotifications] saveFCMToken called, token length:', token.length);
      logger.debug('[usePushNotifications] Getting current user...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        logger.error('[usePushNotifications] Auth error:', authError);
        throw new Error(`Auth error: ${authError.message}`);
      }
      
      if (!user) {
        logger.error('[usePushNotifications] No user found');
        logger.warn('Cannot save FCM token: no user');
        throw new Error('No user logged in');
      }

      logger.debug('[usePushNotifications] User found, preparing Firestore document...');
      
      const docData = {
        token,
        userId: user.id,
        platform: Capacitor.isNativePlatform() ? 'android' : 'web',
        notificationTypes: {
          expiringSoon: true,
          reservationExpired: true,
          reservationCancelled: true,
          newOffersNearby: true,
          favoritePartners: true,
          achievements: true,
          referralRewards: true
        },
        updatedAt: new Date()
      };
      
      logger.debug('[usePushNotifications] Writing to Firestore for platform:', docData.platform);
      
      await setDoc(doc(db, 'fcm_tokens', user.id), docData, { merge: true });

      logger.debug('[usePushNotifications] Token saved to Firestore successfully');
      logger.info('FCM token saved to Firestore successfully');
    } catch (error) {
      logger.error('[usePushNotifications] saveFCMToken error:', error);
      logger.error('Error saving FCM token to Firestore', error);
      throw error; // Re-throw so syncNotifications can catch it
    }
  };

  const saveFCMTokenForUser = async (token: string, userId: string) => {
    if (!userId) {
      throw new Error('Missing userId');
    }

    logger.debug('[usePushNotifications] saveFCMTokenForUser called, token length:', token.length);
    const docData = {
      token,
      userId,
      platform: Capacitor.isNativePlatform() ? 'android' : 'web',
      notificationTypes: {
        expiringSoon: true,
        reservationExpired: true,
        reservationCancelled: true,
        newOffersNearby: true,
        favoritePartners: true,
        achievements: true,
        referralRewards: true
      },
      updatedAt: new Date()
    };

    // IMPORTANT: On native, CapacitorHttp intercepts fetch and breaks Firestore Web SDK's streaming.
    // So we save via Cloud Function (Admin SDK) instead of client Firestore.
    if (Capacitor.isNativePlatform()) {
      const url = 'https://europe-west1-smartpick-app.cloudfunctions.net/saveFcmToken';
      logger.debug('[usePushNotifications] Saving token via Cloud Function');
      const resp = await withTimeout(
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            token,
            platform: docData.platform,
            notificationTypes: docData.notificationTypes
          })
        }),
        8_000,
        'Cloud Function saveFcmToken'
      );

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`saveFcmToken failed: HTTP ${resp.status} ${text}`);
      }

      logger.debug('[usePushNotifications] Token saved via Cloud Function');
      return;
    }

    // Web fallback: direct Firestore write is fine
    const projectId = (db.app.options as { projectId?: string } | undefined)?.projectId ?? 'unknown';
    logger.debug('[usePushNotifications] Firestore setDoc for platform:', docData.platform);
    const tokenDocRef = doc(db, 'fcm_tokens', userId);

    await withTimeout(setDoc(tokenDocRef, docData, { merge: true }), 8_000, 'Firestore setDoc');

    const cacheSnap = await withTimeout(getDocFromCache(tokenDocRef), 2_000, 'Firestore getDocFromCache');
    if (!cacheSnap.exists()) {
      throw new Error('Firestore write not visible in cache after setDoc');
    }

    try {
      await withTimeout(getDocFromServer(tokenDocRef), 5_000, 'Firestore getDocFromServer');
      logger.debug('[usePushNotifications] Firestore server read-back succeeded');
    } catch (e) {
      logger.warn('[usePushNotifications] Firestore server read-back failed (non-fatal):', e);
    }

    logger.debug('[usePushNotifications] Token saved (cache verified)');
  };

  const waitForNativeToken = async (timeoutMs: number): Promise<string> => {
    const startedAt = Date.now();

    return await new Promise((resolve, reject) => {
      const tick = () => {
        const token = fcmTokenRef.current;
        if (token) {
          resolve(token);
          return;
        }

        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for FCM token after ${Math.round(timeoutMs / 1000)}s`));
          return;
        }

        setTimeout(tick, 200);
      };

      tick();
    });
  };

  // Manual sync function for UI button - REQUESTS PERMISSION IF NEEDED
  const syncNotifications = async (userId: string): Promise<boolean> => {
    setIsSyncing(true);
    try {
      const startedAt = Date.now();
      logger.debug('[usePushNotifications] Manual sync triggered');

      return await withTimeout(
        (async () => {
          if (!userId) {
            throw new Error('You must be logged in to enable notifications');
          }
          logger.debug('[usePushNotifications] Using userId for sync');

          if (!fcmTokenRef.current) {
            logger.debug('[usePushNotifications] No token available, requesting permission NOW');
            const permStatus = await withTimeout(PushNotifications.checkPermissions(), 5_000, 'Push checkPermissions');
            logger.debug('[usePushNotifications] Current permission:', permStatus.receive);

            if (permStatus.receive !== 'granted') {
              logger.debug('[usePushNotifications] Requesting permission...');
              const result = await withTimeout(PushNotifications.requestPermissions(), 10_000, 'Push requestPermissions');
              if (result.receive !== 'granted') {
                throw new Error('Notification permission denied');
              }
            }

            await withTimeout(PushNotifications.register(), 10_000, 'Push register');
            logger.debug('[usePushNotifications] Register called, waiting for token...');
          }

          const tokenToSave = fcmTokenRef.current ?? (await waitForNativeToken(10_000));
          logger.debug('[usePushNotifications] Got token, length:', tokenToSave.length, 'chars, saving...');

          await saveFCMTokenForUser(tokenToSave, userId);

          logger.debug('[usePushNotifications] Sync completed in', Date.now() - startedAt, 'ms');
          return true;
        })(),
        20_000,
        'Sync operation'
      );
    } catch (error) {
      logger.error('[usePushNotifications] Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Sync failed: ${errorMessage}`);
      return false;
    } finally {
      logger.debug('[usePushNotifications] Sync finished, resetting isSyncing');
      setIsSyncing(false);
    }
  };

  const subscribeToPush = async (userId: string): Promise<boolean> => {
    setIsSubscribing(true);
    
    try {
      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return false;
      }

      // Get service worker registration
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        logger.warn('Push API not supported');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let pushSubscription = await registration.pushManager.getSubscription();
      
      if (!pushSubscription) {
        // VAPID public key - replace with your actual key from Supabase
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8xQmrEcEzAYNUUvdtHNEjY4zKUiQJJq1XUj5U0wSk8G6q1QrR7RpBk';
        
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        
        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as BufferSource
        });
      }

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          subscription: JSON.stringify(pushSubscription.toJSON()),
          notification_types: {
            nearby: true,
            favorite_partner: true,
            expiring: true
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        logger.error('Failed to save push subscription', error);
        return false;
      }

      setSubscription(pushSubscription);
      logger.info('Push notification subscription successful');
      return true;

    } catch (error) {
      logger.error('Failed to subscribe to push notifications', error);
      return false;
    } finally {
      setIsSubscribing(false);
    }
  };

  const unsubscribeFromPush = async (userId: string): Promise<boolean> => {
    try {
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
      }

      // Remove from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to delete push subscription', error);
        return false;
      }

      logger.info('Push notification unsubscribed');
      return true;

    } catch (error) {
      logger.error('Failed to unsubscribe from push notifications', error);
      return false;
    }
  };

  const updateNotificationTypes = async (
    userId: string,
    types: { nearby?: boolean; favorite_partner?: boolean; expiring?: boolean }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          notification_types: types,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        logger.error('Failed to update notification types', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to update notification types', error);
      return false;
    }
  };

  return {
    permission,
    subscription,
    isSubscribing,
    isSyncing,
    fcmToken,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
    subscribeToPush,
    unsubscribeFromPush,
    updateNotificationTypes,
    requestPermission,
    syncNotifications
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
