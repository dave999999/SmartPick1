import { logger } from '@/lib/logger';
import * as Sentry from "@sentry/react";

// Track if Sentry has already been initialized
let isInitialized = false;

export const initSentry = () => {
  // Prevent multiple initializations
  if (isInitialized) {
    logger.debug('⚠️ Sentry already initialized, skipping...');
    return;
  }

  // Only initialize if DSN is provided
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn || dsn === '' || dsn.includes('...')) {
    logger.debug('⚠️ Sentry DSN not configured or invalid. Error monitoring disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE === 'production' ? 'production' : 'development',
    
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    tracesSampleRate: 1.0, // 100% for better visibility
    
    // Session Replay - captures user interactions (video-like replay)
    // Increased sample rates for better monitoring
    replaysSessionSampleRate: 0.1, // Sample 10% of all sessions
    replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
    
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false, // Show text for better debugging (you can change to true for privacy)
        blockAllMedia: true, // Privacy: block images/videos
      }),
    ],
    
    // Enable debug mode in development
    debug: import.meta.env.MODE !== 'production',

    // Ignore common non-critical errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension',
      'moz-extension',
      // Network errors that are expected
      'Network request failed',
      'NetworkError',
      // ResizeObserver errors (non-critical)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],

    // Add custom tags
    beforeSend(event) {
      // Add custom context
      if (event.user) {
        event.user.segment = 'smartpick-user';
      }
      
      // Filter out localhost errors in production
      if (import.meta.env.MODE === 'production' && event.request?.url?.includes('localhost')) {
        return null;
      }

      return event;
    },
  });

  isInitialized = true;
  logger.debug('✅ Sentry initialized for error monitoring');
};

// Helper to manually capture exceptions
export const captureException = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

// Helper to capture messages
export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.captureMessage(message, level);
};

// Set user context (call after login)
export const setUser = (userId: string, email?: string, name?: string) => {
  Sentry.setUser({
    id: userId,
    email,
    username: name,
  });
};

// Clear user context (call after logout)
export const clearUser = () => {
  Sentry.setUser(null);
};

// Add breadcrumb for tracking user actions
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
};
