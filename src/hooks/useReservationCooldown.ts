/**
 * useReservationCooldown.ts
 * Hook to check if user is in reservation cooldown due to cancellations
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

export interface CooldownInfo {
  isInCooldown: boolean;
  cancellationCount: number;
  timeUntilUnlock: number; // milliseconds
  unlockTime: Date | null;
  resetCooldownUsed: boolean;
  cooldownDurationMinutes: number;
}

export function useReservationCooldown(user: User | null) {
  const [cooldownInfo, setCooldownInfo] = useState<CooldownInfo>({
    isInCooldown: false,
    cancellationCount: 0,
    timeUntilUnlock: 0,
    unlockTime: null,
    resetCooldownUsed: false,
    cooldownDurationMinutes: 30,
  });
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setCooldownInfo({
        isInCooldown: false,
        cancellationCount: 0,
        timeUntilUnlock: 0,
        unlockTime: null,
        resetCooldownUsed: false,
        cooldownDurationMinutes: 30,
      });
      return;
    }

    checkCooldownStatus();

    // Poll every 5 seconds to update countdown
    const pollInterval = setInterval(() => {
      checkCooldownStatus();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [user?.id]);

  const checkCooldownStatus = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        'get_user_consecutive_cancellations',
        { p_user_id: user.id }
      );

      if (error) {
        console.error('Error checking cooldown status:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const { 
          cancellation_count, 
          oldest_cancellation_time, 
          time_until_unlock,
          reset_cooldown_used,
          cooldown_duration_minutes
        } = data[0];
        
        // Parse the interval result
        const timeUntilMs = parseIntervalToMs(time_until_unlock);
        
        setCooldownInfo({
          isInCooldown: cancellation_count >= 3 && timeUntilMs > 0,
          cancellationCount: cancellation_count || 0,
          timeUntilUnlock: timeUntilMs,
          unlockTime: oldest_cancellation_time 
            ? new Date(new Date(oldest_cancellation_time).getTime() + (cooldown_duration_minutes || 30) * 60 * 1000)
            : null,
          resetCooldownUsed: reset_cooldown_used || false,
          cooldownDurationMinutes: cooldown_duration_minutes || 30,
        });
      }
    } catch (err) {
      console.error('Error fetching cooldown status:', err);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await checkCooldownStatus();
  };

  const resetCooldown = async (): Promise<{ success: boolean; message: string }> => {
    if (!user?.id) {
      return { success: false, message: 'User not found' };
    }

    setResetLoading(true);
    try {
      const { data, error } = await supabase.rpc('reset_user_cooldown', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error resetting cooldown:', error);
        return { success: false, message: 'Failed to reset cooldown' };
      }

      if (data && data.length > 0) {
        const { success, message } = data[0];
        
        // Refetch cooldown status after reset
        if (success) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await checkCooldownStatus();
        }

        return { success, message };
      }

      return { success: false, message: 'Unexpected response from server' };
    } catch (err) {
      console.error('Error resetting cooldown:', err);
      return { success: false, message: 'An error occurred while resetting cooldown' };
    } finally {
      setResetLoading(false);
    }
  };

  return { ...cooldownInfo, loading, resetLoading, refetch, resetCooldown };
}

/**
 * Parse PostgreSQL interval to milliseconds
 * Example: "00:25:30" (25 minutes, 30 seconds) = 1530000ms
 */
function parseIntervalToMs(interval: string | null): number {
  if (!interval) return 0;

  // Format could be: "00:25:30" or other PostgreSQL interval formats
  const parts = interval.split(':');
  
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    
    return (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
  }

  return 0;
}
