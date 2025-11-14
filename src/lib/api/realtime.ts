import { supabase, isDemoMode } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Realtime Subscriptions Module
 * Handles real-time database subscriptions for live updates
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
  
  return supabase
    .channel(`public:reservations:partner:${partnerId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'reservations',
      filter: `partner_id=eq.${partnerId}`,
    }, callback)
    .subscribe();
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
