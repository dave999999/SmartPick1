import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    checkExistingSubscription();
  }, []);

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
      if (!('Notification' in window)) {
        logger.warn('Push notifications not supported');
        return false;
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      
      return result === 'granted';
    } catch (error) {
      logger.error('Failed to request notification permission', error);
      return false;
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
    isSupported: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window,
    subscribeToPush,
    unsubscribeFromPush,
    updateNotificationTypes
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
