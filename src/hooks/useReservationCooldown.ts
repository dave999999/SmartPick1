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
  resetCount: number;
}

export function useReservationCooldown(user: User | null, enabled: boolean = true) {
  const [cooldownInfo, setCooldownInfo] = useState<CooldownInfo>({
    isInCooldown: false,
    cancellationCount: 0,
    timeUntilUnlock: 0,
    unlockTime: null,
    resetCooldownUsed: false,
    cooldownDurationMinutes: 30,
    resetCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    // Only run if enabled (modal is open)
    if (!enabled || !user?.id) {
      setCooldownInfo({
        isInCooldown: false,
        cancellationCount: 0,
        timeUntilUnlock: 0,
        unlockTime: null,
        resetCooldownUsed: false,
        cooldownDurationMinutes: 30,
        resetCount: 0,
      });
      return;
    }

    checkCooldownStatus();

    // Poll every 5 seconds to update countdown ONLY if enabled
    const pollInterval = setInterval(() => {
      checkCooldownStatus();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [user?.id, enabled]); // Add enabled to dependencies

  const checkCooldownStatus = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Use is_user_in_cooldown function which returns reset_count
      const { data, error } = await supabase.rpc(
        'is_user_in_cooldown',
        { p_user_id: user.id }
      );

      if (error) {
        console.error('Error checking cooldown status:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const { 
          in_cooldown,
          cooldown_until,  // Fixed: was cooldown_end
          cancellation_count,
          reset_count
        } = data[0];
        
        // Calculate time until unlock
        const timeUntilMs = cooldown_until ? Math.max(0, new Date(cooldown_until).getTime() - Date.now()) : 0;
        
        setCooldownInfo({
          isInCooldown: in_cooldown || false,
          cancellationCount: cancellation_count || 0,
          timeUntilUnlock: timeUntilMs,
          unlockTime: cooldown_until ? new Date(cooldown_until) : null,
          resetCooldownUsed: false, // Deprecated - using resetCount now
          cooldownDurationMinutes: 60, // Now 1 hour cooldown
          resetCount: reset_count || 0,
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

  const liftCooldownWithPoints = async (): Promise<{ success: boolean; message: string }> => {
    if (!user?.id) {
      return { success: false, message: 'User not found' };
    }

    setResetLoading(true);
    try {
      const { data, error } = await supabase.rpc('lift_cooldown_with_points', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('Error lifting cooldown:', error);
        return { success: false, message: 'Failed to lift cooldown' };
      }

      if (data && data.length > 0) {
        const { success, message } = data[0];
        
        // Refetch cooldown status after lift
        if (success) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          await checkCooldownStatus();
        }

        return { success, message };
      }

      return { success: false, message: 'Unexpected response from server' };
    } catch (err) {
      console.error('Error lifting cooldown:', err);
      return { success: false, message: 'An error occurred while lifting cooldown' };
    } finally {
      setResetLoading(false);
    }
  };

  return { ...cooldownInfo, loading, resetLoading, refetch, resetCooldown, liftCooldownWithPoints };
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
