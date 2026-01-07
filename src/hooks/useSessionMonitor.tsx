/**
 * React Hook for Session Timeout Monitoring
 * Professional session management with UI integration
 */

import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  initializeSessionMonitoring,
  stopSessionMonitoring,
  recordActivity,
  getSessionInfo,
  expireSession as manualExpireSession,
} from '@/lib/sessionMonitor';
import { logger } from '@/lib/logger';

interface UseSessionMonitorOptions {
  enabled?: boolean;
  onWarning?: (remainingSeconds: number) => void;
  onExpired?: (reason: 'inactivity' | 'absolute_timeout' | 'manual') => void;
  redirectOnExpire?: boolean;
  redirectPath?: string;
}

export function useSessionMonitor(options: UseSessionMonitorOptions = {}) {
  const {
    enabled = true,
    onWarning,
    onExpired,
    redirectOnExpire = true,
    redirectPath = '/login',
  } = options;

  const navigate = useNavigate();
  const { toast } = useToast();
  const isInitialized = useRef(false);

  // Handle session warning
  const handleWarning = useCallback(
    (remainingSeconds: number) => {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;

      const timeText = minutes > 0 
        ? `${minutes} minute${minutes > 1 ? 's' : ''}`
        : `${seconds} second${seconds > 1 ? 's' : ''}`;

      toast({
        title: '⚠️ Session Expiring',
        description: `Your session will expire in ${timeText} due to inactivity. Move your mouse or click to stay logged in.`,
        duration: 120000, // 2 minutes
        variant: 'destructive',
      });

      logger.warn('[session] User warned about session expiration:', {
        remainingSeconds,
        reason: 'inactivity',
      });

      // Call custom handler if provided
      if (onWarning) {
        onWarning(remainingSeconds);
      }
    },
    [toast, onWarning]
  );

  // Handle session expiration
  const handleExpired = useCallback(
    (reason: 'inactivity' | 'absolute_timeout' | 'manual') => {
      let message = 'Your session has expired. Please log in again.';
      
      if (reason === 'inactivity') {
        message = 'Your session expired due to inactivity. Please log in again.';
      } else if (reason === 'absolute_timeout') {
        message = 'Your session has reached its maximum duration. Please log in again for security.';
      }

      toast({
        title: '🔒 Session Expired',
        description: message,
        duration: 10000,
        variant: 'destructive',
      });

      logger.warn('[session] Session expired:', { reason });

      // Call custom handler if provided
      if (onExpired) {
        onExpired(reason);
      }

      // Redirect to login if enabled
      if (redirectOnExpire) {
        setTimeout(() => {
          navigate(redirectPath, { 
            replace: true,
            state: { sessionExpired: true, reason }
          });
        }, 1000);
      }
    },
    [toast, navigate, redirectPath, redirectOnExpire, onExpired]
  );

  // Initialize session monitoring on mount
  useEffect(() => {
    if (!enabled || isInitialized.current) return;

    logger.info('[session-hook] Initializing session monitoring');
    initializeSessionMonitoring(handleWarning, handleExpired);
    isInitialized.current = true;

    // Cleanup on unmount
    return () => {
      logger.info('[session-hook] Cleaning up session monitoring');
      stopSessionMonitoring();
      isInitialized.current = false;
    };
  }, [enabled, handleWarning, handleExpired]);

  // Expose manual controls
  const extendSession = useCallback(() => {
    recordActivity();
    logger.debug('[session-hook] Session manually extended');
  }, []);

  const endSession = useCallback(async () => {
    await manualExpireSession('manual');
    logger.info('[session-hook] Session manually ended');
  }, []);

  const getInfo = useCallback(() => {
    return getSessionInfo();
  }, []);

  return {
    extendSession,
    endSession,
    getSessionInfo: getInfo,
  };
}

/**
 * USAGE EXAMPLE:
 * 
 * // In your authenticated layout or protected route wrapper:
 * import { useSessionMonitor } from '@/hooks/useSessionMonitor';
 * 
 * function ProtectedLayout() {
 *   const { extendSession, endSession } = useSessionMonitor({
 *     enabled: true,
 *     redirectOnExpire: true,
 *     onWarning: (remainingSeconds) => {
 *       console.log('Session expiring in:', remainingSeconds);
 *     },
 *     onExpired: (reason) => {
 *       console.log('Session expired:', reason);
 *       // Analytics tracking
 *       analytics.track('session_expired', { reason });
 *     }
 *   });
 * 
 *   return (
 *     <div>
 *       <button onClick={extendSession}>Stay Logged In</button>
 *       <button onClick={endSession}>Log Out</button>
 *       <Outlet />
 *     </div>
 *   );
 * }
 */
