import { logger } from '@/lib/logger';
import { supabase, isDemoMode } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Realtime Subscriptions Module
 * Handles real-time database subscriptions for live updates
 * 
 * ⚠️ CRITICAL: Always cleanup subscriptions to prevent memory leaks!
 * 
 * Example usage:
 * ```typescript
 * useEffect(() => {
 *   if (!userId) return;
 *   
 *   const channel = subscribeToReservations(userId, (payload) => {
 *     logger.debug('Update received:', payload);
 *   });
 *   
 *   // ✅ REQUIRED: Cleanup on unmount
 *   return () => {
 *     channel.unsubscribe();
 *   };
 * }, [userId]);
 * ```
 * 
 * 🚀 SCALABILITY LIMITS:
 * - Max 200 concurrent realtime connections
 * - Each subscription = 1 connection
 * - Use polling for non-critical updates
 * - Only use realtime for immediate notifications
 */

/**
 * REMOVED: Global offer subscription was a critical security vulnerability
 * It leaked all partner offers (including draft, rejected, competitor data)
 * 
 * For partner-specific updates, use subscribeToPartnerReservations()
 * For customer offer discovery, use polling/refetch instead of realtime
 * 
 * See: Security audit item "Real-Time Subscription Data Leak"
 */

/**
 * Subscribe to a specific partner's own offers only
 * Use this in Partner Dashboard to get real-time updates for owned offers
 */
export const subscribeToPartnerOffers = (
  partnerId: string,
  callback: (payload: unknown) => void
): RealtimeChannel => {
  if (isDemoMode) {
    return { unsubscribe: () => {} } as RealtimeChannel;
  }
  
  return supabase
    .channel(`partner:offers:${partnerId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'offers',
      filter: `partner_id=eq.${partnerId}`, // ✅ Only this partner's offers
    }, callback)
    .subscribe();
};

/**
 * Subscribe to partner reservations for realtime dashboard updates
 */
export const subscribeToPartnerReservations = (
  partnerId: string, 
  callback: (payload: unknown) => void
): RealtimeChannel => {
  if (isDemoMode) {
    return { unsubscribe: () => {} } as RealtimeChannel;
  }
  
  logger.log('📡 [Realtime] Creating subscription channel for partner:', partnerId);
  
  const channel = supabase
    .channel(`public:reservations:partner:${partnerId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'reservations',
      filter: `partner_id=eq.${partnerId}`,
    }, (payload) => {
      logger.log('📥 [Realtime] Postgres change received:', {
        event: payload.eventType,
        table: payload.table,
        schema: payload.schema
      });
      callback(payload);
    });
  
  // Don't auto-subscribe here - let caller handle it with status callback
  return channel;
};

export const subscribeToReservations = (
  customerId: string, 
  callback: (payload: unknown) => void
): RealtimeChannel => {
  if (isDemoMode) {
    return { unsubscribe: () => {} } as RealtimeChannel;
  }
  
  return supabase
    .channel(`reservations:${customerId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'reservations', filter: `customer_id=eq.${customerId}` },
      callback
    )
    .subscribe();
};
