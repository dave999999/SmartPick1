/**
 * Penalty System API
 * Handles all penalty-related operations including detection, application, lifting, and forgiveness
 */

import { supabase } from '../supabase';
import { logger } from '../logger';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface UserPenalty {
  id: string;
  user_id: string;
  reservation_id: string;
  partner_id: string;
  offense_number: number;
  offense_type: 'missed_pickup' | 'late_cancellation' | 'no_show';
  penalty_type: 'warning' | '1hour' | '24hour' | 'permanent';
  suspended_until: string | null;
  is_active: boolean;
  acknowledged: boolean;
  acknowledged_at: string | null;
  can_lift_with_points: boolean;
  points_required: number;
  lifted_with_points: boolean;
  points_spent: number | null;
  lifted_at: string | null;
  forgiveness_requested: boolean;
  forgiveness_request_message: string | null;
  forgiveness_requested_at: string | null;
  forgiveness_status: 'pending' | 'granted' | 'denied' | 'expired' | null;
  forgiveness_response_message: string | null;
  forgiveness_decided_by: string | null;
  forgiveness_decided_at: string | null;
  forgiveness_expires_at: string | null;
  admin_reviewed: boolean;
  admin_decision: string | null;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PenaltyConfig {
  type: 'warning' | '1hour' | '24hour' | 'permanent';
  duration: number | null; // in seconds
  canLift: boolean;
  pointCost: number;
}

export interface CanReserveResult {
  can_reserve: boolean;
  reason: string | null;
  suspended_until: string | null;
  penalty_id: string | null;
}

export interface ActivePenaltyResult {
  penalty_id: string;
  offense_number: number;
  penalty_type: string;
  suspended_until: string | null;
  can_lift_with_points: boolean;
  points_required: number;
  forgiveness_status: string | null;
  time_remaining: string | null;
}

// Penalty configuration
export const PENALTY_CONFIG: Record<number, PenaltyConfig> = {
  1: { type: 'warning', duration: null, canLift: false, pointCost: 0 },
  2: { type: '1hour', duration: 3600, canLift: true, pointCost: 100 },
  3: { type: '24hour', duration: 86400, canLift: true, pointCost: 500 },
  4: { type: 'permanent', duration: null, canLift: false, pointCost: 0 }
};

// ============================================
// PENALTY CHECK FUNCTIONS
// ============================================

/**
 * Check if user can make reservations
 */
export async function canUserReserve(userId: string): Promise<CanReserveResult> {
  try {
    logger.log('[Penalty] Checking if user can reserve:', userId);
    
    const { data, error } = await supabase
      .rpc('can_user_reserve', { p_user_id: userId });
    
    if (error) throw error;
    
    const result = data?.[0] || { can_reserve: true, reason: null, suspended_until: null, penalty_id: null };
    logger.log('[Penalty] Can reserve result:', result);
    
    return result;
  } catch (error) {
    logger.error('[Penalty] Error checking if user can reserve:', error);
    // Fail open - allow reservation if check fails
    return { can_reserve: true, reason: null, suspended_until: null, penalty_id: null };
  }
}

/**
 * Check if user is in cooldown period (3+ cancels in 30min = 1hr cooldown)
 */
export async function getUserCooldownStatus(userId: string): Promise<{
  inCooldown: boolean;
  cooldownUntil: Date | null;
  cancellationCount: number;
}> {
  try {
    logger.log('[Cooldown] Checking cooldown status for user:', userId);
    
    const { data, error } = await supabase
      .rpc('is_user_in_cooldown', { p_user_id: userId });
    
    if (error) throw error;
    
    const result = data?.[0] || { in_cooldown: false, cooldown_until: null, cancellation_count: 0 };
    
    const cooldownStatus = {
      inCooldown: result.in_cooldown,
      cooldownUntil: result.cooldown_until ? new Date(result.cooldown_until) : null,
      cancellationCount: result.cancellation_count || 0
    };
    
    logger.log('[Cooldown] Status:', cooldownStatus);
    
    return cooldownStatus;
  } catch (error) {
    logger.error('[Cooldown] Error checking cooldown status:', error);
    // Fail open - allow reservation if check fails
    return { inCooldown: false, cooldownUntil: null, cancellationCount: 0 };
  }
}

/**
 * Get user's active penalty
 */
export async function getActivePenalty(userId: string): Promise<ActivePenaltyResult | null> {
  try {
    logger.log('[Penalty] Getting active penalty for user:', userId);
    
    const { data, error } = await supabase
      .rpc('get_active_penalty', { p_user_id: userId });
    
    if (error) throw error;
    
    const penalty = data?.[0] || null;
    logger.log('[Penalty] Active penalty:', penalty);
    
    return penalty;
  } catch (error) {
    logger.error('[Penalty] Error getting active penalty:', error);
    return null;
  }
}

/**
 * Get full penalty details with relations
 */
export async function getPenaltyDetails(penaltyId: string): Promise<UserPenalty | null> {
  try {
    const { data, error } = await supabase
      .from('user_penalties')
      .select(`
        *,
        users!user_penalties_user_id_fkey(id, email, name, reliability_score),
        partners!user_penalties_partner_id_fkey(id, business_name),
        reservations!user_penalties_reservation_id_fkey(id, offer_id, quantity, status, created_at, expires_at)
      `)
      .eq('id', penaltyId)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    logger.error('[Penalty] Error getting penalty details:', error);
    return null;
  }
}

/**
 * Get user's offense history
 */
export async function getUserOffenseHistory(userId: string) {
  try {
    const { data, error } = await supabase
      .from('penalty_offense_history')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
    
    return data || null;
  } catch (error) {
    logger.error('[Penalty] Error getting offense history:', error);
    return null;
  }
}

/**
 * Get user's penalty history (all penalties)
 */
export async function getUserPenaltyHistory(userId: string): Promise<UserPenalty[]> {
  try {
    const { data, error } = await supabase
      .from('user_penalties')
      .select(`
        *,
        partners!user_penalties_partner_id_fkey(business_name),
        reservations!user_penalties_reservation_id_fkey(offer_title, picked_up_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    logger.error('[Penalty] Error getting penalty history:', error);
    return [];
  }
}

// ============================================
// PENALTY APPLICATION
// ============================================

/**
 * Apply penalty to user for missed pickup
 * Called by cron job or manually
 */
export async function applyPenalty(reservationId: string): Promise<UserPenalty | null> {
  try {
    logger.log('[Penalty] Applying penalty for reservation:', reservationId);
    
    // Get reservation details
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('*, users!reservations_user_id_fkey(id), partners!reservations_partner_id_fkey(id)')
      .eq('id', reservationId)
      .single();
    
    if (resError) throw resError;
    if (!reservation) throw new Error('Reservation not found');
    
    const userId = reservation.user_id;
    const partnerId = reservation.partner_id;
    
    // Get user's offense history
    const { data: penalties, error: histError } = await supabase
      .from('user_penalties')
      .select('offense_number')
      .eq('user_id', userId)
      .order('offense_number', { ascending: false });
    
    if (histError) throw histError;
    
    const offenseNumber = (penalties?.[0]?.offense_number || 0) + 1;
    const config = PENALTY_CONFIG[offenseNumber] || PENALTY_CONFIG[4];
    
    const suspendedUntil = config.duration 
      ? new Date(Date.now() + config.duration * 1000).toISOString()
      : null;
    
    // Create penalty record
    const { data: penalty, error: penaltyError } = await supabase
      .from('user_penalties')
      .insert({
        user_id: userId,
        reservation_id: reservationId,
        partner_id: partnerId,
        offense_number: offenseNumber,
        offense_type: 'missed_pickup',
        penalty_type: config.type,
        suspended_until: suspendedUntil,
        can_lift_with_points: config.canLift,
        points_required: config.pointCost,
        forgiveness_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
      })
      .select()
      .single();
    
    if (penaltyError) throw penaltyError;
    
    // Update user status
    const { error: userError } = await supabase
      .from('users')
      .update({
        is_suspended: offenseNumber > 1,
        suspended_until: suspendedUntil,
        current_penalty_level: offenseNumber,
        total_missed_pickups: (penalties?.length || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (userError) throw userError;
    
    // Mark reservation as penalty applied
    const { error: resUpdateError } = await supabase
      .from('reservations')
      .update({ 
        status: 'missed',
        penalty_applied: true,
        penalty_id: penalty.id
      })
      .eq('id', reservationId);
    
    if (resUpdateError) throw resUpdateError;
    
    logger.log('[Penalty] Penalty applied successfully:', penalty);
    return penalty;
  } catch (error) {
    logger.error('[Penalty] Error applying penalty:', error);
    return null;
  }
}

// ============================================
// PENALTY ACKNOWLEDGMENT
// ============================================

/**
 * User acknowledges they've seen the penalty
 */
export async function acknowledgePenalty(penaltyId: string, userId: string): Promise<boolean> {
  try {
    logger.log('[Penalty] User acknowledging penalty:', { penaltyId, userId });
    
    // First get the penalty to check its type
    const { data: penalty, error: fetchError } = await supabase
      .from('user_penalties')
      .select('penalty_type, suspended_until')
      .eq('id', penaltyId)
      .eq('user_id', userId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Determine if penalty should be deactivated
    const shouldDeactivate = 
      penalty.penalty_type === 'warning' || // Warnings are deactivated when acknowledged
      (penalty.suspended_until && new Date(penalty.suspended_until) < new Date()); // Expired penalties
    
    const { error } = await supabase
      .from('user_penalties')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
        is_active: shouldDeactivate ? false : undefined, // Only update if deactivating
        updated_at: new Date().toISOString()
      })
      .eq('id', penaltyId)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    logger.log('[Penalty] Penalty acknowledged successfully', { deactivated: shouldDeactivate });
    return true;
  } catch (error) {
    logger.error('[Penalty] Error acknowledging penalty:', error);
    return false;
  }
}

// ============================================
// POINT LIFT SYSTEM
// ============================================

/**
 * Lift ban using SmartPoints
 */
export async function liftBanWithPoints(penaltyId: string, userId: string): Promise<{
  success: boolean;
  newBalance?: number;
  error?: string;
}> {
  try {
    logger.log('[Penalty] User attempting to lift ban with points:', { penaltyId, userId });
    
    // Get penalty details
    const { data: penalty, error: penaltyError } = await supabase
      .from('user_penalties')
      .select('*')
      .eq('id', penaltyId)
      .eq('user_id', userId)
      .single();
    
    if (penaltyError) throw penaltyError;
    if (!penalty) return { success: false, error: 'Penalty not found' };
    if (!penalty.can_lift_with_points) return { success: false, error: 'This penalty cannot be lifted with points' };
    if (penalty.lifted_with_points) return { success: false, error: 'Penalty already lifted' };
    
    // Get user's point balance
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('balance')
      .eq('user_id', userId)
      .single();
    
    if (pointsError) throw pointsError;
    if (!userPoints) return { success: false, error: 'User points not found' };
    
    const currentBalance = userPoints.balance || 0;
    
    if (currentBalance < penalty.points_required) {
      return { 
        success: false, 
        error: `Insufficient points. Need ${penalty.points_required}, have ${currentBalance}` 
      };
    }
    
    const newBalance = currentBalance - penalty.points_required;
    
    // Deduct points
    const { error: deductError } = await supabase
      .from('user_points')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (deductError) throw deductError;
    
    // Log transaction
    const { error: txError } = await supabase
      .from('penalty_point_transactions')
      .insert({
        user_id: userId,
        penalty_id: penaltyId,
        points_spent: penalty.points_required,
        previous_balance: currentBalance,
        new_balance: newBalance,
        transaction_type: 'ban_lift'
      });
    
    if (txError) logger.error('[Penalty] Error logging transaction:', txError);
    
    // Lift penalty
    const { error: liftError } = await supabase
      .from('user_penalties')
      .update({
        lifted_with_points: true,
        lifted_at: new Date().toISOString(),
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', penaltyId);
    
    if (liftError) throw liftError;
    
    // Update user status
    const { error: userError } = await supabase
      .from('users')
      .update({
        is_suspended: false,
        suspended_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (userError) throw userError;
    
    // Update offense history
    const { error: histError } = await supabase
      .from('penalty_offense_history')
      .update({
        total_point_lifts: supabase.rpc('increment', { amount: 1 }),
        total_points_spent_on_lifts: supabase.rpc('increment', { amount: penalty.points_required }),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    
    if (histError) logger.error('[Penalty] Error updating offense history:', histError);
    
    logger.log('[Penalty] Ban lifted successfully with points');
    return { success: true, newBalance };
  } catch (error) {
    logger.error('[Penalty] Error lifting ban with points:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// FORGIVENESS SYSTEM
// ============================================

/**
 * User requests forgiveness from partner
 */
export async function requestForgiveness(
  penaltyId: string, 
  userId: string, 
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.log('[Penalty] User requesting forgiveness:', { penaltyId, userId });
    
    const { data: penalty, error: penaltyError } = await supabase
      .from('user_penalties')
      .select('*')
      .eq('id', penaltyId)
      .eq('user_id', userId)
      .single();
    
    if (penaltyError) throw penaltyError;
    if (!penalty) return { success: false, error: 'Penalty not found' };
    if (penalty.forgiveness_requested) return { success: false, error: 'Forgiveness already requested' };
    
    const expiresAt = new Date(penalty.forgiveness_expires_at || '');
    if (expiresAt < new Date()) {
      return { success: false, error: 'Forgiveness request period expired (24 hours from offense)' };
    }
    
    const { error } = await supabase
      .from('user_penalties')
      .update({
        forgiveness_requested: true,
        forgiveness_request_message: message,
        forgiveness_requested_at: new Date().toISOString(),
        forgiveness_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', penaltyId);
    
    if (error) throw error;
    
    logger.log('[Penalty] Forgiveness requested successfully');
    return { success: true };
  } catch (error) {
    logger.error('[Penalty] Error requesting forgiveness:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Partner decides on forgiveness request
 */
export async function partnerDecideForgiveness(
  penaltyId: string,
  partnerId: string,
  decision: 'granted' | 'denied',
  message?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.log('[Penalty] Partner deciding forgiveness:', { penaltyId, partnerId, decision });
    
    // Get partner's user_id
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('user_id')
      .eq('id', partnerId)
      .single();
    
    if (partnerError) throw partnerError;
    if (!partner) return { success: false, error: 'Partner not found' };
    
    const { data: penalty, error: penaltyError } = await supabase
      .from('user_penalties')
      .select('*')
      .eq('id', penaltyId)
      .eq('partner_id', partnerId)
      .single();
    
    if (penaltyError) throw penaltyError;
    if (!penalty) return { success: false, error: 'Penalty not found' };
    if (penalty.forgiveness_status !== 'pending') return { success: false, error: 'Forgiveness not pending' };
    
    const updates: any = {
      forgiveness_status: decision,
      forgiveness_response_message: message,
      forgiveness_decided_at: new Date().toISOString(),
      forgiveness_decided_by: partner.user_id,
      updated_at: new Date().toISOString()
    };
    
    if (decision === 'granted') {
      updates.is_active = false;
      updates.suspended_until = null;
      
      // Update user status - remove suspension
      const { error: userError } = await supabase
        .from('users')
        .update({
          is_suspended: false,
          suspended_until: null,
          current_penalty_level: Math.max(0, penalty.offense_number - 1),
          updated_at: new Date().toISOString()
        })
        .eq('id', penalty.user_id);
      
      if (userError) throw userError;
      
      // Update offense history
      const { error: histError } = await supabase
        .from('penalty_offense_history')
        .update({
          total_forgiven: supabase.rpc('increment', { amount: 1 }),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', penalty.user_id);
      
      if (histError) logger.error('[Penalty] Error updating offense history:', histError);
    }
    
    const { error } = await supabase
      .from('user_penalties')
      .update(updates)
      .eq('id', penaltyId);
    
    if (error) throw error;
    
    logger.log('[Penalty] Forgiveness decision processed successfully');
    return { success: true };
  } catch (error) {
    logger.error('[Penalty] Error deciding forgiveness:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get pending forgiveness requests for partner
 */
export async function getPendingForgivenessRequests(partnerId: string) {
  try {
    const { data, error } = await supabase
      .from('user_penalties')
      .select(`
        *,
        users!user_penalties_user_id_fkey(id, name, email, reliability_score),
        reservations!user_penalties_reservation_id_fkey(id, picked_up_at, total_price, offer:offers(title))
      `)
      .eq('partner_id', partnerId)
      .eq('forgiveness_status', 'pending')
      .order('forgiveness_requested_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    logger.error('[Penalty] Error getting pending forgiveness requests:', error);
    return [];
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Admin overrides penalty decision
 */
export async function adminOverridePenalty(
  penaltyId: string,
  adminUserId: string,
  decision: 'unban' | 'reduce_penalty' | 'keep_banned' | 'extend_ban',
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.log('[Penalty] Admin overriding penalty:', { penaltyId, adminUserId, decision });
    
    const updates: any = {
      admin_reviewed: true,
      admin_decision: decision,
      admin_notes: notes,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (decision === 'unban') {
      updates.is_active = false;
      updates.suspended_until = null;
      
      // Get penalty to update user
      const { data: penalty } = await supabase
        .from('user_penalties')
        .select('user_id')
        .eq('id', penaltyId)
        .single();
      
      if (penalty) {
        await supabase
          .from('users')
          .update({
            is_suspended: false,
            suspended_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', penalty.user_id);
      }
    }
    
    const { error } = await supabase
      .from('user_penalties')
      .update(updates)
      .eq('id', penaltyId);
    
    if (error) throw error;
    
    logger.log('[Penalty] Admin override processed successfully');
    return { success: true };
  } catch (error) {
    logger.error('[Penalty] Error processing admin override:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all penalties for admin dashboard
 */
export async function getAllPenalties(limit = 100, offset = 0) {
  try {
    const { data, error } = await supabase
      .from('user_penalties')
      .select(`
        *,
        users!user_penalties_user_id_fkey(id, name, email),
        partners!user_penalties_partner_id_fkey(id, business_name),
        reservations!user_penalties_reservation_id_fkey(id, offer_title)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    logger.error('[Penalty] Error getting all penalties:', error);
    return [];
  }
}
