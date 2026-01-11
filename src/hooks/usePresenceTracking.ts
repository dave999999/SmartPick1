/**
 * Presence Tracking Hook - ADMIN ONLY
 * 
 * Tracks user presence ONLY when admin is viewing the dashboard.
 * This saves database resources by avoiding constant heartbeats from all users.
 * 
 * Usage:
 * ```tsx
 * import { usePresenceTracking } from '@/hooks/usePresenceTracking';
 * 
 * function AdminDashboard() {
 *   usePresenceTracking(); // Only use in admin dashboard!
 *   return <YourDashboard />;
 * }
 * ```
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const HEARTBEAT_INTERVAL = 60000; // 60 seconds (economical)
const RETRY_DELAY = 5000; // 5 seconds on error

function detectPlatform(): 'WEB' | 'IOS' | 'ANDROID' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'IOS';
  } else if (/android/.test(userAgent)) {
    return 'ANDROID';
  } else {
    return 'WEB';
  }
}

export function usePresenceTracking() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);

  const sendHeartbeat = async () => {
    try {
      // Only send if user is authenticated and tab is visible
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !isActiveRef.current) {
        logger.debug('[Presence] Skipping heartbeat - no session or tab hidden');
        return;
      }

      // ADMIN-ONLY: Check if current user is admin before tracking presence
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userData || !['ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
        logger.debug('[Presence] Skipping heartbeat - user is not admin');
        return;
      }

      const platform = detectPlatform();
      const userAgent = navigator.userAgent;

      // Efficient RPC call (single query, upsert operation)
      const { error } = await supabase.rpc('update_user_presence', {
        p_platform: platform,
        p_user_agent: userAgent,
        p_ip_address: null // Server can extract from request if needed
      });

      if (error) {
        logger.error('[Presence] Heartbeat failed:', error);
      } else {
        logger.debug(`[Presence] Heartbeat sent (${platform})`);
      }
    } catch (error) {
      logger.error('[Presence] Heartbeat error:', error);
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        logger.debug('[Presence] Not authenticated - skipping presence tracking');
        return;
      }

      // Send initial heartbeat
      logger.info('[Presence] Starting ADMIN-ONLY presence tracking');
      sendHeartbeat();

      // Setup interval for periodic heartbeats
      intervalRef.current = setInterval(() => {
        if (isActiveRef.current && !document.hidden) {
          sendHeartbeat();
        } else {
          logger.debug('[Presence] Heartbeat paused - tab hidden');
        }
      }, HEARTBEAT_INTERVAL);
    };

    checkAuth();

    // Handle visibility changes (pause when tab is hidden to save resources)
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
      
      if (!document.hidden) {
        logger.debug('[Presence] Tab visible - resuming heartbeat');
        sendHeartbeat(); // Immediate heartbeat when tab becomes visible
      } else {
        logger.debug('[Presence] Tab hidden - pausing heartbeat');
      }
    };

    // Handle tab close/navigation (cleanup presence)
    const handleBeforeUnload = () => {
      // Note: Can't make async calls in beforeunload, so presence will auto-expire after 5 min
      logger.debug('[Presence] User leaving - presence will auto-expire');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      logger.info('[Presence] Stopping presence tracking');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
