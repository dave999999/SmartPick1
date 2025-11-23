import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Realtime Update Notifier
 * Listens for database schema changes and notifies users to refresh
 */

let channel: ReturnType<typeof supabase.channel> | null = null;
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 60000; // 1 minute cooldown between notifications

export function initRealtimeUpdateChecker() {
  // Only in production
  if (!import.meta.env.PROD) {
    logger.log('[Realtime] Update checker disabled in development');
    return;
  }

  try {
    // Subscribe to a special metadata table for deployment notifications
    channel = supabase
      .channel('app-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_metadata'
        },
        (payload) => {
          logger.log('[Realtime] Database update detected:', payload);
          handleDatabaseUpdate(payload);
        }
      )
      .subscribe((status) => {
        logger.log('[Realtime] Subscription status:', status);
      });

    logger.log('[Realtime] Update checker initialized');

    // Check on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkForDatabaseUpdates();
      }
    });

  } catch (error) {
    logger.error('[Realtime] Failed to initialize update checker:', error);
  }
}

function handleDatabaseUpdate(payload: any) {
  const now = Date.now();
  
  // Cooldown to prevent notification spam
  if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
    logger.log('[Realtime] Skipping notification (cooldown)');
    return;
  }

  lastNotificationTime = now;

  // Check if it's a version update
  if (payload.new?.key === 'schema_version' || payload.new?.key === 'migration_version') {
    logger.log('[Realtime] Schema update detected, suggesting refresh');
    
    // Use a subtle toast instead of confirm dialog
    if (typeof window !== 'undefined') {
      // If toast is available (from sonner)
      const event = new CustomEvent('database-update', {
        detail: { message: 'Database updated! Refresh recommended.' }
      });
      window.dispatchEvent(event);
    }
  }
}

async function checkForDatabaseUpdates() {
  try {
    // Query the metadata table to check for recent updates
    const { data, error } = await supabase
      .from('app_metadata')
      .select('key, value, updated_at')
      .eq('key', 'schema_version')
      .maybeSingle();

    if (error) {
      logger.warn('[Realtime] Could not check for updates:', error);
      return;
    }

    if (data) {
      const storedVersion = localStorage.getItem('last_schema_version');
      const currentVersion = data.value;

      if (storedVersion && storedVersion !== currentVersion) {
        logger.log('[Realtime] Schema version changed:', { old: storedVersion, new: currentVersion });
        
        // Dispatch update event
        const event = new CustomEvent('database-update', {
          detail: { message: 'New updates available! Click to refresh.' }
        });
        window.dispatchEvent(event);
      }

      localStorage.setItem('last_schema_version', currentVersion);
    }
  } catch (error) {
    logger.error('[Realtime] Error checking for updates:', error);
  }
}

export function cleanupRealtimeUpdateChecker() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
    logger.log('[Realtime] Update checker cleaned up');
  }
}
