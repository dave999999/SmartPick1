/**
 * Activity Tracking Hook
 * Updates user's last_seen timestamp for real-time monitoring
 * 
 * Optimized:
 * - 10-minute intervals (down from 5min) - 50% reduction
 * - Pauses when tab is hidden - saves additional 25-50%
 * - Resumes immediately when tab becomes visible
 */

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const UPDATE_INTERVAL = 10 * 60 * 1000; // 10 minutes (optimized from 5)

export function useActivityTracking() {
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const updateActivity = async () => {
      // Don't update if tab is hidden - saves queries when user is multitasking
      if (document.hidden) {
        logger.debug('⏸️ Activity tracking paused - tab hidden');
        return;
      }

      try {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Update last_seen timestamp
        await supabase.rpc('update_user_last_seen');
        logger.debug('✅ Activity timestamp updated');
      } catch (error) {
        // Silent fail - function may not exist yet
        logger.debug('Activity tracking update failed', { error });
      }
    };

    // Initialize tracking
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update immediately on mount (if tab is visible)
      await updateActivity();

      // Update every 10 minutes while user is active
      interval = setInterval(updateActivity, UPDATE_INTERVAL);
    };

    init();

    // Update immediately when tab becomes visible (user came back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        logger.debug('👁️ Tab visible - updating activity');
        updateActivity();
      } else {
        logger.debug('👁️ Tab hidden - activity tracking will pause');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
