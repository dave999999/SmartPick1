import { logger } from '@/lib/logger';
import { supabase } from './supabase';
import { notifyAchievement, notifyReferralReward } from './pushNotifications';

// ============================================
// DEVICE FINGERPRINTING
// ============================================

/**
 * Generate device fingerprint for fraud detection
 * Combines screen resolution, timezone, language, platform
 */
function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.language,
    navigator.platform,
    navigator.hardwareConcurrency || 'unknown',
  ];
  
  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

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
      logger.error('Error fetching user stats:', error instanceof Error ? error.message : String(error));
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error in getUserStats:', error instanceof Error ? error.message : String(error));
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
      logger.error('Error fetching user achievements:', error instanceof Error ? error.message : String(error));
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('Error in getUserAchievements:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Claim an unlocked achievement and receive reward points
 */
export async function claimAchievement(achievementId: string): Promise<{ success: boolean; awarded_now?: boolean; reward_points?: number; balance?: number } | null> {
  try {
    logger.debug('🎯 Claiming achievement:', achievementId);
    const { data, error } = await supabase.rpc('claim_achievement', { p_achievement_id: achievementId });
    if (error) {
      logger.error('❌ RPC error claiming achievement:', error instanceof Error ? error.message : String(error));
      logger.error('Error details:', JSON.stringify(error, null, 2));
      return null;
    }
    logger.debug('✅ Claim successful:', data);
    
    // Send push notification for achievement unlock (fire-and-forget)
    if (data && data.success && data.awarded_now) {
      const user = (await supabase.auth.getUser()).data.user;
      if (user?.id) {
        // Get achievement details to include in notification
        const { data: achievement } = await supabase
          .from('achievement_definitions')
          .select('name, reward_points')
          .eq('id', achievementId)
          .single();
        
        if (achievement) {
          notifyAchievement(
            user.id,
            achievement.name,
            achievement.reward_points
          ).catch(err => 
            logger.warn('Achievement push notification failed (non-blocking):', err)
          );
        }
      }
    }
    
    return data as any;
  } catch (error) {
    logger.error('💥 Exception in claimAchievement:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Get all achievement definitions
 */
export async function getAllAchievements(): Promise<AchievementDefinition[]> {
  try {
    logger.debug('Fetching all achievements from database...');
    const { data, error } = await supabase
      .from('achievement_definitions')
      .select('*')
      .eq('is_active', true)
      .order('tier', { ascending: true });

    if (error) {
      logger.error('Error fetching achievements:', error instanceof Error ? error.message : String(error));
      return [];
    }

    logger.debug('Fetched achievements:', data?.length || 0);
    return data || [];
  } catch (error) {
    logger.error('Error in getAllAchievements:', error instanceof Error ? error.message : String(error));
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
      logger.error('Error marking achievement as viewed:', error instanceof Error ? error.message : String(error));
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error in markAchievementViewed:', error instanceof Error ? error.message : String(error));
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
      logger.error('Error generating referral code:', error instanceof Error ? error.message : String(error));
      return null;
    }

    const code = data as string;

    // Update user with referral code
    const { error: updateError } = await supabase
      .from('users')
      .update({ referral_code: code })
      .eq('id', userId);

    if (updateError) {
      logger.error('Error updating user with referral code:', updateError instanceof Error ? updateError.message : String(updateError));
      return null;
    }

    return code;
  } catch (error) {
    logger.error('Error in generateReferralCode:', error instanceof Error ? error.message : String(error));
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
      logger.error('Error fetching referral code:', error instanceof Error ? error.message : String(error));
      return null;
    }

    if (!data) {
      logger.warn('User not found for referral code lookup:', userId);
      return null;
    }

    // If no referral code, generate one
    if (!data.referral_code) {
      return await generateReferralCode(userId);
    }

    return data.referral_code;
  } catch (error) {
    logger.error('Error in getUserReferralCode:', error instanceof Error ? error.message : String(error));
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
): Promise<{ success: boolean; error?: string; pointsAwarded?: number; flagged?: boolean }> {
  try {
    // Generate device fingerprint
    const deviceFingerprint = generateDeviceFingerprint();
    
    // Get user agent
    const userAgent = navigator.userAgent;

    // Note: Client-side IP detection is not reliable (use Cloudflare headers server-side)
    // But we can still pass the fingerprint and user agent
    const { data, error } = await supabase.rpc('apply_referral_code_with_rewards', {
      p_new_user_id: newUserId,
      p_referral_code: referralCode,
      p_ip_address: null, // IP should be captured server-side via Cloudflare/Edge functions
      p_user_agent: userAgent,
      p_device_fingerprint: deviceFingerprint
    });

    if (error) {
      logger.error('Error applying referral code:', error instanceof Error ? error.message : String(error));
      return { success: false, error: 'Failed to apply referral code' };
    }

    const result = data as { 
      success: boolean; 
      error?: string; 
      points_awarded?: number;
      suspicious_score?: number;
      flagged?: boolean;
    };

    if (!result.success) {
      return { success: false, error: result.error || 'Invalid referral code' };
    }

    // Log if flagged for monitoring
    if (result.flagged) {
      logger.warn('Referral flagged for review:', {
        suspiciousScore: result.suspicious_score,
        referralCode
      });
    }

    // Send push notification to referrer about successful referral (fire-and-forget)
    if (result.success && result.points_awarded) {
      // Get referrer ID and new user name from the referral code
      const { data: referralData } = await supabase
        .from('referral_codes')
        .select('user_id, users:users(name)')
        .eq('code', referralCode)
        .single();
      
      if (referralData?.user_id) {
        const { data: newUser } = await supabase
          .from('users')
          .select('name')
          .eq('id', newUserId)
          .single();
        
        notifyReferralReward(
          referralData.user_id,
          newUser?.name || 'New user',
          result.points_awarded
        ).catch(err => 
          logger.warn('Referral push notification failed (non-blocking):', err)
        );
      }
    }

    return {
      success: true,
      pointsAwarded: result.points_awarded || 50,
      flagged: result.flagged || false
    };
  } catch (error) {
    logger.error('Error in applyReferralCode:', error instanceof Error ? error.message : String(error));
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

