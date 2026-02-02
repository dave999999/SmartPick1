/**
 * DeferredPushNotifications - Wrapper to prevent blocking UI thread on cold start
 * 
 * ⚡ ANR FIX: Delays push notification initialization by 2 seconds to allow
 * smooth app startup. Push notifications are not critical for initial render.
 */

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';

export function DeferredPushNotifications() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Defer initialization to prevent blocking initial render
    const timer = setTimeout(() => {
      logger.debug('🔔 Initializing push notifications (deferred 2s)');
      setIsReady(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;

    // Only run after delay
    const initPushNotifications = async () => {
      try {
        const platform = Capacitor.getPlatform();
        logger.debug('[DeferredPush] Platform:', platform, 'isNative:', Capacitor.isNativePlatform());
        
        if (Capacitor.isNativePlatform()) {
          // Native mobile - use FCM
          await PushNotifications.addListener('registration', (token) => {
            logger.debug('[DeferredPush] FCM TOKEN received:', token.value.substring(0, 30) + '...');
          });

          await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            logger.log('Push notification received:', notification);
          });

          await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            logger.log('Push notification action:', notification);
          });

          await PushNotifications.addListener('registrationError', (error: any) => {
            logger.error('FCM Registration error:', error);
          });

          // Check permission status
          const permStatus = await PushNotifications.checkPermissions();
          logger.debug('[DeferredPush] Permission status:', permStatus);

          if (permStatus.receive === 'granted') {
            await PushNotifications.register();
            logger.debug('[DeferredPush] Registered for push notifications');
          }
        } else {
          // Web - check existing Web Push
          if ('Notification' in window && Notification.permission === 'granted') {
            logger.debug('[DeferredPush] Web push already enabled');
          }
        }
      } catch (error) {
        logger.error('[DeferredPush] Initialization error:', error);
      }
    };

    initPushNotifications();
  }, [isReady]);

  return null;
}
