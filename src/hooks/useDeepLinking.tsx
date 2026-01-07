/**
 * Deep Link Handler for Capacitor App
 * 
 * Handles incoming deep links from web (e.g., smartpick.ge/offer/123)
 * and routes to appropriate screens in the app.
 * 
 * Supported paths:
 * - /offer/:id - View offer details
 * - /reservation/:id - View reservation details  
 * - /partner/:id - View partner profile
 * - / - Home page
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { logger } from '@/lib/logger';

export function useDeepLinking() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for app URL open events (deep links)
    const handleAppUrlOpen = (event: URLOpenListenerEvent) => {
      try {
        const url = event.url;
        logger.log('[DeepLink] Received URL:', url);

        // Parse the URL
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        const searchParams = urlObj.searchParams;

        // Route to appropriate screen
        if (path.startsWith('/offer/')) {
          const offerId = path.replace('/offer/', '');
          logger.log('[DeepLink] Opening offer:', offerId);
          navigate(`/reserve/${offerId}`);
        } 
        else if (path.startsWith('/reservation/')) {
          const reservationId = path.replace('/reservation/', '');
          logger.log('[DeepLink] Opening reservation:', reservationId);
          navigate(`/reservation/${reservationId}`);
        }
        else if (path.startsWith('/partner/')) {
          const partnerId = path.replace('/partner/', '');
          logger.log('[DeepLink] Opening partner profile:', partnerId);
          navigate(`/partner/${partnerId}`);
        }
        else if (path === '/my-picks' || path === '/reservations') {
          logger.log('[DeepLink] Opening My Picks');
          navigate('/my-picks');
        }
        else if (path === '/wallet' || path === '/points') {
          logger.log('[DeepLink] Opening Wallet');
          navigate('/wallet');
        }
        else if (path === '/partner-dashboard') {
          logger.log('[DeepLink] Opening Partner Dashboard');
          navigate('/partner-dashboard');
        }
        else if (path === '/partner-application') {
          logger.log('[DeepLink] Opening Partner Application');
          navigate('/partner-application');
        }
        else if (path === '/profile') {
          logger.log('[DeepLink] Opening Profile');
          navigate('/profile');
        }
        else if (path === '/') {
          logger.log('[DeepLink] Opening Home');
          navigate('/');
        }
        else {
          // Unknown path - go to home
          logger.warn('[DeepLink] Unknown path, opening home:', path);
          navigate('/');
        }

      } catch (error) {
        logger.error('[DeepLink] Failed to handle URL:', error);
        // On error, just go to home
        navigate('/');
      }
    };

    let listenerHandle: any = null;

    // Register the listener - addListener returns a Promise
    App.addListener('appUrlOpen', handleAppUrlOpen).then(handle => {
      listenerHandle = handle;
    });

    // Check if app was opened with a URL (cold start)
    App.getLaunchUrl().then(result => {
      if (result && result.url) {
        logger.log('[DeepLink] App launched with URL:', result.url);
        handleAppUrlOpen({ url: result.url });
      }
    }).catch(error => {
      logger.error('[DeepLink] Failed to get launch URL:', error);
    });

    // Cleanup listener on unmount
    return () => {
      listenerHandle?.remove();
    };
  }, [navigate]);
}

// Export a component wrapper for convenience
export function DeepLinkHandler() {
  useDeepLinking();
  return null;
}
