import { supabase } from './supabase';

// ============================================
// TYPES
// ============================================

export interface UserStats {
  id: string;
  user_id: string;
  total_reservations: number;
  total_money_saved: number;
  favorite_category: string | null;
  most_visited_partner_id: string | null;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string;
  total_referrals: number;
    category_counts: Record<string, number>;
    unique_partners_visited: number;
    partner_visit_counts: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'social' | 'engagement' | 'savings';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: any;
  reward_points: number;
  is_active: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  is_new: boolean;
  viewed_at: string | null;
  reward_claimed?: boolean;
  reward_claimed_at?: string | null;
  points_awarded?: number;
  achievement?: AchievementDefinition;
}

export interface UserLevel {
  level: number;
  name: string;
  minReservations: number;
  maxReservations: number;
  benefits: string[];
  color: string;
  icon: string;
}

// ============================================
// USER LEVELS CONFIGURATION
// ============================================

export const USER_LEVELS: UserLevel[] = [
  {
    level: 1,
    name: 'Newcomer',
    minReservations: 0,
    maxReservations: 4,
    benefits: ['Access to all deals', '100 welcome points'],
    color: '#94A3B8',
    icon: '🌱'
  },
  {
    level: 2,
    name: 'Explorer',
    minReservations: 5,
    maxReservations: 14,
    benefits: ['Priority notifications', 'Early access to new partners'],
    color: '#60A5FA',
    icon: '🔍'
  },
  {
    level: 3,
    name: 'Regular',
    minReservations: 15,
    maxReservations: 29,
    benefits: ['2% bonus savings', 'Exclusive weekly deals'],
    color: '#34D399',
    icon: '⭐'
  },
  {
    level: 4,
    name: 'VIP',
    minReservations: 30,
    maxReservations: 49,
    benefits: ['5% bonus savings', 'VIP customer support', 'Partner discounts'],
    color: '#A78BFA',
    icon: '👑'
  },
  {
    level: 5,
    name: 'Legend',
    minReservations: 50,
    maxReservations: Infinity,
    benefits: ['10% bonus savings', 'Lifetime VIP status', 'Exclusive events', 'Personal concierge'],
    color: '#F59E0B',
    icon: '🏆'
  }
];

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserStats:', error);
    return null;
  }
}

/**
 * Get user achievements with definitions
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievement_definitions(*)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserAchievements:', error);
    return [];
  }
}

/**
 * Claim an unlocked achievement and receive reward points
 */
export async function claimAchievement(achievementId: string): Promise<{ success: boolean; awarded_now?: boolean; reward_points?: number; balance?: number } | null> {
  try {
    console.log('🎯 Claiming achievement:', achievementId);
    const { data, error } = await supabase.rpc('claim_achievement', { p_achievement_id: achievementId });
    if (error) {
      console.error('❌ RPC error claiming achievement:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return null;
    }
    console.log('✅ Claim successful:', data);
    return data as any;
  } catch (error) {
    console.error('💥 Exception in claimAchievement:', error);
    return null;
  }
}

/**
 * Get all achievement definitions
 */
export async function getAllAchievements(): Promise<AchievementDefinition[]> {
  try {
    console.log('Fetching all achievements from database...');
    const { data, error } = await supabase
      .from('achievement_definitions')
      .select('*')
      .eq('is_active', true)
      .order('tier', { ascending: true });

    if (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }

    console.log('Fetched achievements:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error in getAllAchievements:', error);
    return [];
  }
}

/**
 * Mark achievement as viewed
 */
export async function markAchievementViewed(achievementId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_achievements')
      .update({
        is_new: false,
        viewed_at: new Date().toISOString()
      })
      .eq('achievement_id', achievementId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error marking achievement as viewed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markAchievementViewed:', error);
    return false;
  }
}

/**
 * Get user's current level based on reservations
 */
export function getUserLevel(totalReservations: number): UserLevel {
  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    if (totalReservations >= USER_LEVELS[i].minReservations) {
      return USER_LEVELS[i];
    }
  }
  return USER_LEVELS[0];
}

/**
 * Get progress to next level
 */
export function getLevelProgress(totalReservations: number): {
  currentLevel: UserLevel;
  nextLevel: UserLevel | null;
  progress: number;
  reservationsToNext: number;
} {
  const currentLevel = getUserLevel(totalReservations);
  const currentLevelIndex = USER_LEVELS.indexOf(currentLevel);
  const nextLevel = currentLevelIndex < USER_LEVELS.length - 1 ? USER_LEVELS[currentLevelIndex + 1] : null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progress: 100,
      reservationsToNext: 0
    };
  }

  const reservationsInCurrentLevel = totalReservations - currentLevel.minReservations;
  const reservationsNeededForNextLevel = nextLevel.minReservations - currentLevel.minReservations;
  const progress = (reservationsInCurrentLevel / reservationsNeededForNextLevel) * 100;
  const reservationsToNext = nextLevel.minReservations - totalReservations;

  return {
    currentLevel,
    nextLevel,
    progress: Math.min(100, progress),
    reservationsToNext: Math.max(0, reservationsToNext)
  };
}

/**
 * Generate and set referral code for user
 */
export async function generateReferralCode(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('generate_referral_code');

    if (error) {
      console.error('Error generating referral code:', error);
      return null;
    }

    const code = data as string;

    // Update user with referral code
    const { error: updateError } = await supabase
      .from('users')
      .update({ referral_code: code })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user with referral code:', updateError);
      return null;
    }

    return code;
  } catch (error) {
    console.error('Error in generateReferralCode:', error);
    return null;
  }
}

/**
 * Get user's referral code
 */
export async function getUserReferralCode(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching referral code:', error);
      return null;
    }

    if (!data) {
      console.warn('User not found for referral code lookup:', userId);
      return null;
    }

    // If no referral code, generate one
    if (!data.referral_code) {
      return await generateReferralCode(userId);
    }

    return data.referral_code;
  } catch (error) {
    console.error('Error in getUserReferralCode:', error);
    return null;
  }
}

/**
 * Apply referral code (when new user signs up)
 * Awards 50 points to referrer and checks achievements
 */
export async function applyReferralCode(
  newUserId: string,
  referralCode: string
): Promise<{ success: boolean; error?: string; pointsAwarded?: number }> {
  try {
    const { data, error } = await supabase.rpc('apply_referral_code_with_rewards', {
      p_new_user_id: newUserId,
      p_referral_code: referralCode
    });

    if (error) {
      console.error('Error applying referral code:', error);
      return { success: false, error: 'Failed to apply referral code' };
    }

    const result = data as { success: boolean; error?: string; points_awarded?: number };

    if (!result.success) {
      return { success: false, error: result.error || 'Invalid referral code' };
    }

    return {
      success: true,
      pointsAwarded: result.points_awarded || 50
    };
  } catch (error) {
    console.error('Error in applyReferralCode:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Get achievement tier color
 */
export function getAchievementTierColor(tier: string): string {
  const colors: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2'
  };
  return colors[tier] || '#CBD5E1';
}

/**
 * Get achievement category color
 */
export function getAchievementCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    milestone: '#3B82F6',
    social: '#8B5CF6',
    engagement: '#10B981',
    savings: '#F59E0B'
  };
  return colors[category] || '#6B7280';
}

/**
 * Format money saved display
 */
export function formatMoneySaved(amount: number): string {
  const n = typeof amount === 'number' && isFinite(amount) ? amount : 0;
  return `₾${n.toFixed(2)}`;
}
export function getStreakEmoji(days: number): string {
  if (days >= 30) return '🏆';
  if (days >= 7) return '⚡';
  if (days >= 3) return '🔥';
  return '✨';
}

