/**
 * Service Worker registration and management hook
 */

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      logger.warn('[SW] Service Workers not supported');
      return;
    }

    setIsSupported(true);

    // Register service worker
    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });

        setRegistration(reg);
        logger.info('[SW] Service Worker registered', { scope: reg.scope });

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              setUpdateAvailable(true);
              logger.info('[SW] Update available');
              
              toast.info('🔄 App update available', {
                description: 'Click to reload and update',
                action: {
                  label: 'Update',
                  onClick: () => {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  },
                },
                duration: 10000,
              });
            }
          });
        });

        // Handle service worker controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          logger.info('[SW] Controller changed, reloading...');
          window.location.reload();
        });

        // Check for updates periodically (every hour)
        setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000);
      } catch (error) {
        logger.error('[SW] Registration failed', error);
      }
    };

    registerSW();
  }, []);

  // Send message to service worker
  const sendMessage = (message: any) => {
    if (registration?.active) {
      registration.active.postMessage(message);
    }
  };

  // Cache offers in service worker
  const cacheOffers = (offers: any[]) => {
    sendMessage({ type: 'CACHE_OFFERS', offers });
  };

  // Clear cache
  const clearCache = async () => {
    return new Promise((resolve, reject) => {
      if (!registration?.active) {
        reject(new Error('No active service worker'));
        return;
      }

      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve(true);
        } else {
          reject(new Error('Failed to clear cache'));
        }
      };

      registration.active.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  };

  return {
    registration,
    isSupported,
    updateAvailable,
    cacheOffers,
    clearCache,
    sendMessage,
  };
}
