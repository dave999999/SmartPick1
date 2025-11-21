/**
 * Activity Tracking Hook
 * Updates user's last_seen timestamp for real-time monitoring
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useActivityTracking() {
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const updateActivity = async () => {
      try {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Update last_seen timestamp
        await supabase.rpc('update_user_last_seen');
      } catch (error) {
        // Silent fail - function may not exist yet
        logger.debug('Activity tracking update failed', { error });
      }
    };

    // Initialize tracking
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update immediately on mount
      await updateActivity();

      // Update every 5 minutes while user is active
      interval = setInterval(updateActivity, UPDATE_INTERVAL);
    };

    init();

    // Update on visibility change (when tab becomes visible)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
