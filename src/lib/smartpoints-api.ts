import { supabase } from './supabase';
import { emitPointsChange } from './pointsEventBus';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UserPoints {
  id: string;
  user_id: string;
  balance: number;
  updated_at: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  change: number;
  reason: string;
  balance_before: number;
  balance_after: number;
  metadata?: any;
  created_at: string;
}

export interface DeductPointsResult {
  success: boolean;
  balance?: number;
  error?: string;
  required?: number;
  transaction_id?: string;
}

export interface AddPointsResult {
  success: boolean;
  balance?: number;
  transaction_id?: string;
}

/**
 * Get current user's SmartPoints balance
 * If user is a partner, returns partner_points instead
 */
export async function getUserPoints(userId: string): Promise<UserPoints | null> {
  try {
    // Check if user is a partner
    const { data: profile } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'APPROVED')
      .maybeSingle();

    // If user is a partner, get partner points
    if (profile?.id) {
      const { data, error } = await supabase
        .from('partner_points')
        .select('*')
        .eq('partner_id', profile.id)
        .single();

      if (error) {
        console.error('Error fetching partner points:', error);
        return null;
      }

      // Map partner_points to UserPoints interface for compatibility
      return data ? {
        ...data,
        user_id: userId, // Add user_id for compatibility
        partner_id: profile.id
      } as UserPoints : null;
    }

    // Regular customer points
    const { data, error } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user points:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserPoints:', error);
    return null;
  }
}

/**
 * Get user's point transaction history
 */
export async function getPointTransactions(
  userId: string,
  limit: number = 10
): Promise<PointTransaction[]> {
  try {
    // Check if user is a partner
    const { data: profile } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'APPROVED')
      .maybeSingle();

    // If user is a partner, get partner transactions instead
    if (profile?.id) {
      const { data, error } = await supabase
        .from('partner_point_transactions')
        .select('*')
        .eq('partner_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching partner transactions:', error);
        return [];
      }

      // Map partner transactions to match PointTransaction interface
      return (data || []).map(tx => ({
        ...tx,
        user_id: userId, // Add user_id for compatibility
        partner_id: profile.id
      })) as PointTransaction[];
    }

    // Regular customer transactions
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPointTransactions:', error);
    return [];
  }
}

/**
 * Deduct points from user (for reservations)
 * Uses database function for atomic operations
 */
export async function deductPoints(
  userId: string,
  amount: number,
  reason: string,
  metadata?: any
): Promise<DeductPointsResult> {
  try {
    const { data, error } = await supabase.rpc('deduct_user_points', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_metadata: metadata || {}
    });

    if (error) {
      console.error('Error deducting points:', error);
      return {
        success: false,
        error: 'Failed to deduct points'
      };
    }

    const result = data as DeductPointsResult;

    // Emit event to notify all listeners about the points change
    if (result.success && result.balance !== undefined) {
      emitPointsChange(result.balance, userId);
    }

    return result;
  } catch (error) {
    console.error('Error in deductPoints:', error);
    return {
      success: false,
      error: 'Network error'
    };
  }
}

/**
 * Add points to user (for purchases, admin adjustments)
 * Uses database function for atomic operations
 */
export async function addPoints(
  userId: string,
  amount: number,
  reason: string,
  metadata?: any
): Promise<AddPointsResult> {
  try {
    const { data, error } = await supabase.rpc('add_user_points', {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_metadata: metadata || {}
    });

    if (error) {
      console.error('Error adding points:', error);
      return {
        success: false
      };
    }

    const result = data as AddPointsResult;

    // Emit event to notify all listeners about the points change
    if (result.success && result.balance !== undefined) {
      emitPointsChange(result.balance, userId);
    }

    return result;
  } catch (error) {
    console.error('Error in addPoints:', error);
    return {
      success: false
    };
  }
}

/**
 * Check if user has enough points for a reservation
 */
export async function checkSufficientPoints(
  userId: string,
  requiredPoints: number = 5
): Promise<{ sufficient: boolean; balance: number }> {
  const userPoints = await getUserPoints(userId);

  if (!userPoints) {
    return { sufficient: false, balance: 0 };
  }

  return {
    sufficient: userPoints.balance >= requiredPoints,
    balance: userPoints.balance
  };
}

/**
 * Purchase SmartPoints (mock for now, integrate with Stripe later)
 */
export async function purchasePoints(
  userId: string,
  amount: number,
  paymentIntentId?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    // In production, verify payment with Stripe first
    const result = await addPoints(userId, amount, 'purchase', {
      payment_intent_id: paymentIntentId,
      package: '100_points',
      price_gel: 1
    });

    if (result.success) {
      return {
        success: true,
        newBalance: result.balance
      };
    }

    return {
      success: false,
      error: 'Failed to add points'
    };
  } catch (error) {
    console.error('Error purchasing points:', error);
    return {
      success: false,
      error: 'Purchase failed'
    };
  }
}

/**
 * Format transaction reason for display
 */
export function formatTransactionReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    'registration': '🎉 Welcome Bonus',
    'reservation': '🛍️ Reservation',
    'purchase': '💳 Purchase',
    'refund': '↩️ Refund',
    'admin_adjustment': '⚙️ Admin Adjustment',
    'referral': '👥 Referral Bonus',
    'streak_bonus': '🔥 Streak Bonus'
  };

  return reasonMap[reason] || reason;
}

/**
 * Format points change for display
 */
export function formatPointsChange(change: number): string {
  if (change > 0) {
    return `+${change}`;
  }
  return `${change}`;
}

/**
 * Subscribe to real-time updates for user points
 * @param userId User ID to subscribe to
 * @param callback Function called when points balance changes
 * @returns Supabase channel for cleanup
 */
export function subscribeToUserPoints(
  userId: string,
  callback: (newBalance: number) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`user_points:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_points',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        const newBalance = (payload.new as UserPoints).balance;
        callback(newBalance);
      }
    )
    .subscribe();

  return channel;
}
