import { supabase } from './supabase';
import { emitPointsChange } from './pointsEventBus';

/**
 * Penalty System for No-Show Customers
 *
 * Escalation levels:
 * 1st offense: 30 minutes
 * 2nd offense: 90 minutes
 * 3rd offense: 24 hours (1 day)
 * 4th+ offense: Permanent ban (requires admin intervention)
 */

export interface PenaltyStatus {
  isPenalized: boolean;
  isBanned: boolean;
  penaltyCount: number;
  penaltyUntil: string | null;
  penaltyMinutesRemaining: number | null;
  penaltyMessage: string | null;
  canRequestForgiveness?: boolean;
  reservationId?: string | null;
}

// Penalty durations in minutes
const PENALTY_DURATIONS = {
  FIRST: 30,      // 30 minutes
  SECOND: 90,     // 1.5 hours
  THIRD: 1440,    // 24 hours (1 day)
  PERMANENT: null // Permanent ban
};

/**
 * Calculate penalty duration based on offense count
 */
export function getPenaltyDuration(offenseCount: number): number | null {
  switch (offenseCount) {
    case 1:
      return PENALTY_DURATIONS.FIRST;
    case 2:
      return PENALTY_DURATIONS.SECOND;
    case 3:
      return PENALTY_DURATIONS.THIRD;
    default:
      return PENALTY_DURATIONS.PERMANENT; // 4+ offenses = permanent ban
  }
}

/**
 * Get human-readable penalty duration text
 */
export function getPenaltyDurationText(offenseCount: number): string {
  const duration = getPenaltyDuration(offenseCount);

  if (duration === null) {
    return 'Permanent ban';
  }

  if (duration < 60) {
    return `${duration} minutes`;
  } else if (duration < 1440) {
    const hours = Math.floor(duration / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(duration / 1440);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
}

/**
 * Apply penalty to a user for not showing up
 * First offense: Warning only (no actual penalty)
 * Second offense onwards: Progressive penalties
 */
export async function applyNoShowPenalty(userId: string, reservationId: string) {
  try {
    // Get current user penalty status
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('penalty_count, is_banned, penalty_warning_shown')
      .eq('id', userId)
      .single();

    if (userError) {
      // If column doesn't exist, provide helpful error
      if (userError.message?.includes('does not exist')) {
        throw new Error('Penalty system not configured. Please run the penalty migration in Supabase.');
      }
      throw userError;
    }
    if (!user) throw new Error('User not found');

    // Check if already banned
    if (user.is_banned) {
      return {
        success: false,
        message: 'User is already permanently banned',
        penaltyStatus: {
          isPenalized: true,
          isBanned: true,
          penaltyCount: user.penalty_count,
        },
      };
    }

    const currentPenaltyCount = user.penalty_count || 0;
    
    // FIRST OFFENSE: Warning only, no actual penalty
    if (currentPenaltyCount === 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          penalty_warning_shown: true,
          last_penalty_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Mark reservation as no-show but keep it visible as warning
      const { error: reservationError } = await supabase
        .from('reservations')
        .update({
          no_show: true,
          status: 'EXPIRED'
        })
        .eq('id', reservationId);

      if (reservationError) throw reservationError;

      return {
        success: true,
        isWarning: true,
        message: 'First-time warning issued. User will be educated about penalty system.',
        penaltyStatus: {
          isPenalized: false,
          isBanned: false,
          penaltyCount: 0,
          penaltyUntil: null,
          penaltyDuration: 'Warning only',
        },
      };
    }

    // SUBSEQUENT OFFENSES: Apply actual penalties
    // Count starts from 1 for penalty purposes (since first offense was warning)
    const newPenaltyCount = currentPenaltyCount + 1;
    const penaltyDuration = getPenaltyDuration(newPenaltyCount);

    // Calculate penalty expiry time
    let penaltyUntil: Date | null = null;
    let isBanned = false;

    if (penaltyDuration === null) {
      // Permanent ban (4th+ offense)
      isBanned = true;
    } else {
      // Temporary penalty
      penaltyUntil = new Date();
      penaltyUntil.setMinutes(penaltyUntil.getMinutes() + penaltyDuration);
    }

    // Update user with penalty
    const { error: updateError } = await supabase
      .from('users')
      .update({
        penalty_count: newPenaltyCount,
        penalty_until: penaltyUntil?.toISOString() || null,
        is_banned: isBanned,
        last_penalty_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Mark reservation as no-show
    // Also force status to EXPIRED so it disappears from active list (schema allows EXPIRED)
    const { error: reservationError } = await supabase
      .from('reservations')
      .update({
        no_show: true,
        status: 'EXPIRED'
      })
      .eq('id', reservationId);

    if (reservationError) throw reservationError;

    return {
      success: true,
      message: isBanned
        ? 'User has been permanently banned for repeated no-shows'
        : `User penalized for ${getPenaltyDurationText(newPenaltyCount)}`,
      penaltyStatus: {
        isPenalized: true,
        isBanned,
        penaltyCount: newPenaltyCount,
        penaltyUntil: penaltyUntil?.toISOString() || null,
        penaltyDuration: getPenaltyDurationText(newPenaltyCount),
      },
    };
  } catch (error) {
    console.error('Error applying no-show penalty:', error);
    return {
      success: false,
      message: 'Failed to apply penalty',
      error,
    };
  }
}

/**
 * Check if user is currently penalized
 */
export async function checkUserPenaltyStatus(userId: string): Promise<PenaltyStatus> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('penalty_count, penalty_until, is_banned')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return {
        isPenalized: false,
        isBanned: false,
        penaltyCount: 0,
        penaltyUntil: null,
        penaltyMinutesRemaining: null,
        penaltyMessage: null,
        canRequestForgiveness: false,
        reservationId: null,
      };
    }

    // Check if banned
    if (user.is_banned) {
      return {
        isPenalized: true,
        isBanned: true,
        penaltyCount: user.penalty_count || 0,
        penaltyUntil: null,
        penaltyMinutesRemaining: null,
        penaltyMessage: 'Your account has been permanently banned due to repeated no-shows. Please contact support.',
        canRequestForgiveness: false,
        reservationId: null,
      };
    }

    // Check if penalty is active
    if (user.penalty_until) {
      const penaltyExpiry = new Date(user.penalty_until);
      const now = new Date();

      if (penaltyExpiry > now) {
        // Penalty is still active
        const minutesRemaining = Math.ceil((penaltyExpiry.getTime() - now.getTime()) / (1000 * 60));

        let timeText = '';
        if (minutesRemaining < 60) {
          timeText = `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`;
        } else if (minutesRemaining < 1440) {
          const hours = Math.ceil(minutesRemaining / 60);
          timeText = `${hours} hour${hours !== 1 ? 's' : ''}`;
        } else {
          const days = Math.ceil(minutesRemaining / 1440);
          timeText = `${days} day${days !== 1 ? 's' : ''}`;
        }

        // Get the most recent no-show reservation for forgiveness
        const { data: recentNoShow } = await supabase
          .from('reservations')
          .select('id')
          .eq('customer_id', userId)
          .eq('no_show', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const penaltyCount = user.penalty_count || 0;
        // Allow forgiveness requests for first 2 penalties (30min and 90min)
        const canRequestForgiveness = penaltyCount <= 2;

        return {
          isPenalized: true,
          isBanned: false,
          penaltyCount,
          penaltyUntil: user.penalty_until,
          penaltyMinutesRemaining: minutesRemaining,
          penaltyMessage: `You cannot make reservations for ${timeText} due to not picking up previous reservations.`,
          canRequestForgiveness,
          reservationId: recentNoShow?.id || null,
        };
      }
    }

    // No active penalty
    return {
      isPenalized: false,
      isBanned: false,
      penaltyCount: user.penalty_count || 0,
      penaltyUntil: null,
      penaltyMinutesRemaining: null,
      penaltyMessage: null,
      canRequestForgiveness: false,
      reservationId: null,
    };
  } catch (error) {
    console.error('Error checking penalty status:', error);
    return {
      isPenalized: false,
      isBanned: false,
      penaltyCount: 0,
      penaltyUntil: null,
      penaltyMinutesRemaining: null,
      penaltyMessage: null,
      canRequestForgiveness: false,
      reservationId: null,
    };
  }
}

/**
 * Clear user penalty (admin only)
 */
export async function clearUserPenalty(userId: string, clearBan: boolean = false) {
  try {
    const updates: any = {
      penalty_until: null,
    };

    if (clearBan) {
      updates.is_banned = false;
      updates.penalty_count = 0;
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;

    return {
      success: true,
      message: clearBan ? 'Ban and penalties cleared' : 'Active penalty cleared',
    };
  } catch (error) {
    console.error('Error clearing penalty:', error);
    return {
      success: false,
      message: 'Failed to clear penalty',
      error,
    };
  }
}

/**
 * Lift penalty early by spending SmartPoints
 * Cost: 30 points for 30min penalty, 90 points for 90min penalty
 * Not available for 24hr+ penalties or permanent bans
 */
export async function liftPenaltyWithPoints(userId: string) {
  try {
    // Use secure RPC that derives auth.uid(), deducts points atomically and clears penalty
    let { data, error } = await supabase.rpc('lift_penalty_with_points');

    if (error) {
      console.error('RPC lift_penalty_with_points error:', error);
      const msg = error.message || 'Failed to lift penalty';
      // Detect missing function (schema cache / 404) and surface actionable guidance
      const lower = msg.toLowerCase();
      if (
        lower.includes('could not find the function') ||
        lower.includes('schema cache') ||
        lower.includes('404 not found') ||
        lower.includes('pgrst116') // PostgREST missing function code
      ) {
        // Retry with schema-qualified name once
        try {
          const retry = await supabase.rpc('public.lift_penalty_with_points');
          if (!retry.error) {
            data = retry.data as any;
            error = null as any;
          }
        } catch (e) {
          // ignore, will fall through to guidance
        }
      }

      if (error) {
        return {
          success: false,
          migrationMissing: true,
          message:
            'Penalty lift function not deployed yet. Apply migration supabase/migrations/20251107_lift_penalty_with_points.sql in Supabase SQL editor, then retry.',
        } as any;
      }
    }

    const result = (data || {}) as { success: boolean; balance?: number; message?: string };
    if (result.success && typeof result.balance === 'number') {
      emitPointsChange(result.balance, userId);
      return { success: true, message: result.message || 'Penalty lifted', newBalance: result.balance };
    }

    return { success: false, message: result.message || 'Failed to lift penalty' };
  } catch (error) {
    console.error('Error lifting penalty with points:', error);
    return {
      success: false,
      message: 'Failed to lift penalty',
      error,
    };
  }
}

