import { supabase, isDemoMode } from '../supabase';
import { PenaltyInfo } from '../types';
import {
  PENALTY_FIRST_OFFENSE_HOURS,
  PENALTY_SECOND_OFFENSE_HOURS,
} from '../constants';

export const checkUserPenalty = async (userId: string): Promise<PenaltyInfo> => {
  if (isDemoMode) {
    return { isUnderPenalty: false, penaltyCount: 0 };
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('penalty_until, penalty_count')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return { isUnderPenalty: false, penaltyCount: 0 };
    }

    const now = new Date();
    const penaltyUntil = user.penalty_until ? new Date(user.penalty_until) : null;
    
    if (penaltyUntil && penaltyUntil > now) {
      const diff = penaltyUntil.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      return {
        isUnderPenalty: true,
        penaltyUntil,
        remainingTime: `${hours}h ${minutes}m`,
        penaltyCount: user.penalty_count || 0,
      };
    }

    return {
      isUnderPenalty: false,
      penaltyCount: user.penalty_count || 0,
    };
  } catch (error) {
    console.error('Error checking penalty:', error);
    return { isUnderPenalty: false, penaltyCount: 0 };
  }
};

export const applyPenalty = async (userId: string): Promise<void> => {
  if (isDemoMode) return;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('penalty_count')
      .eq('id', userId)
      .single();

    const currentCount = user?.penalty_count || 0;
    const newCount = currentCount + 1;

    // Third offense = permanent ban
    if (newCount >= 3) {
      await supabase
        .from('users')
        .update({
          penalty_count: newCount,
          status: 'BANNED',
          penalty_until: null, // No time limit - permanent ban
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      return;
    }

    // First and second offense = temporary penalty
    let penaltyHours = 0;
    if (newCount === 1) {
      penaltyHours = PENALTY_FIRST_OFFENSE_HOURS; // 0.5 hours = 30 min
    } else if (newCount === 2) {
      penaltyHours = PENALTY_SECOND_OFFENSE_HOURS; // 1 hour
    }

    const penaltyUntil = new Date();
    penaltyUntil.setHours(penaltyUntil.getHours() + penaltyHours);

    await supabase
      .from('users')
      .update({
        penalty_count: newCount,
        penalty_until: penaltyUntil.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Error applying penalty:', error);
  }
};

export const clearPenalty = async (userId: string): Promise<void> => {
  if (isDemoMode) return;

  try {
    await supabase
      .from('users')
      .update({
        penalty_count: 0,
        penalty_until: null,
        status: 'ACTIVE', // Remove ban status
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch (error) {
    console.error('Error clearing penalty:', error);
  }
};
