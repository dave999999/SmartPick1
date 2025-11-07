import { supabase } from './supabase';

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
 */
export async function applyNoShowPenalty(userId: string, reservationId: string) {
  try {
    // Get current user penalty status
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('penalty_count, is_banned')
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

    // Increment penalty count
    const newPenaltyCount = (user.penalty_count || 0) + 1;
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
    const { error: reservationError } = await supabase
      .from('reservations')
      .update({
        no_show: true,
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

        return {
          isPenalized: true,
          isBanned: false,
          penaltyCount: user.penalty_count || 0,
          penaltyUntil: user.penalty_until,
          penaltyMinutesRemaining: minutesRemaining,
          penaltyMessage: `You cannot make reservations for ${timeText} due to not picking up previous reservations.`,
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
    // Get current user status
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('penalty_count, penalty_until, is_banned, points_balance')
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    if (!user) throw new Error('User not found');

    // Check if banned
    if (user.is_banned) {
      return {
        success: false,
        message: 'Permanent bans cannot be lifted with points. Contact support.',
      };
    }

    // Check if penalty is active
    if (!user.penalty_until) {
      return {
        success: false,
        message: 'No active penalty to lift',
      };
    }

    const penaltyExpiry = new Date(user.penalty_until);
    const now = new Date();

    if (penaltyExpiry <= now) {
      return {
        success: false,
        message: 'Penalty has already expired',
      };
    }

    // Calculate cost based on penalty count (previous offense level)
    const penaltyCount = user.penalty_count || 0;
    let pointsCost = 0;

    if (penaltyCount === 1) {
      pointsCost = 30; // 30 points for 30min penalty
    } else if (penaltyCount === 2) {
      pointsCost = 90; // 90 points for 90min penalty
    } else {
      // 24hr+ penalties cannot be lifted with points
      return {
        success: false,
        message: 'This penalty cannot be lifted with points. You must wait it out.',
      };
    }

    // Check if user has enough points
    const currentBalance = user.points_balance || 0;
    if (currentBalance < pointsCost) {
      return {
        success: false,
        message: `Insufficient points. Need ${pointsCost} points, you have ${currentBalance}.`,
        pointsNeeded: pointsCost,
        pointsAvailable: currentBalance,
      };
    }

    // Deduct points and clear penalty
    const { error: updateError } = await supabase
      .from('users')
      .update({
        penalty_until: null,
        points_balance: currentBalance - pointsCost,
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Log the transaction
    const { error: txError } = await supabase
      .from('smartpoints_transactions')
      .insert({
        user_id: userId,
        amount: -pointsCost,
        transaction_type: 'PENALTY_LIFT',
        description: `Lifted ${penaltyCount === 1 ? '30min' : '90min'} penalty early`,
        status: 'COMPLETED',
      });

    if (txError) console.warn('Failed to log penalty lift transaction:', txError);

    return {
      success: true,
      message: `Penalty lifted! ${pointsCost} points deducted.`,
      pointsSpent: pointsCost,
      newBalance: currentBalance - pointsCost,
    };
  } catch (error) {
    console.error('Error lifting penalty with points:', error);
    return {
      success: false,
      message: 'Failed to lift penalty',
      error,
    };
  }
}

