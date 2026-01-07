import { supabase, isDemoMode } from '../supabase';
import { Reservation } from '../types';
import {
  MAX_RESERVATION_QUANTITY,
  MAX_ACTIVE_RESERVATIONS,
  RESERVATION_HOLD_MINUTES,
  ERROR_MESSAGES,
} from '../constants';
import { 
  notifyPartnerNewReservation as notifyPartnerTelegram, 
  notifyCustomerReservationConfirmed as notifyCustomerTelegram,
  notifyPartnerLowStock as notifyPartnerLowStockTelegram
} from '../telegram';
import { 
  notifyPartnerNewReservation as notifyPartnerPush,
  notifyReservationConfirmed as notifyCustomerPush
} from '../pushNotifications';
import { logger } from '../logger';
import { canUserReserve, getPenaltyDetails } from './penalty';
import { getOfferById } from './offers';
import { checkServerRateLimit } from '../rateLimiter-server';

/**
 * Reservations Module
 * Handles reservation creation, retrieval, QR validation, pickup, and cancellation
 */

export interface QRValidationResult {
  valid: boolean;
  reservation?: Reservation;
  error?: string;
}

export const createReservation = async (
  offerId: string,
  customerId: string,
  quantity: number
): Promise<Reservation> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase to create reservations');
  }

  // ✅ RATE LIMITING: Prevent spam and abuse (10 reservations per hour)
  const rateLimitCheck = await checkServerRateLimit('reservation', customerId);
  if (!rateLimitCheck.allowed) {
    throw new Error(rateLimitCheck.message || 'Too many reservation attempts. Please wait before trying again.');
  }

  // Check if user is banned
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('status')
    .eq('id', customerId)
    .single();

  if (userError) {
    throw new Error('Failed to verify user status');
  }

  if (userData?.status === 'BANNED') {
    throw new Error('Your account has been banned due to repeated no-shows. Please contact support.');
  }

  // Check new penalty system
  const canReserve = await canUserReserve(customerId);
  
  if (!canReserve.can_reserve) {
    // Get full penalty details for frontend to show modal
    if (canReserve.penalty_id) {
      const penaltyDetails = await getPenaltyDetails(canReserve.penalty_id);
      throw new Error(JSON.stringify({
        type: 'PENALTY_BLOCKED',
        penalty: penaltyDetails,
        message: canReserve.reason
      }));
    }
    throw new Error(`Cannot create reservation: ${canReserve.reason}`);
  }

  // 🔥 CRITICAL: Auto-expire old reservations BEFORE checking active count
  const { expireUserReservations } = await import('./penalty');
  await expireUserReservations(customerId);

  // Check active reservations limit (only 1 active reservation allowed)
  const { data: activeReservations, error: activeError } = await supabase
    .from('reservations')
    .select('id')
    .eq('customer_id', customerId)
    .eq('status', 'ACTIVE')
    .limit(MAX_ACTIVE_RESERVATIONS + 1);

  if (activeError) {
    throw new Error('Failed to check active reservations');
  }

  if (activeReservations && activeReservations.length >= MAX_ACTIVE_RESERVATIONS) {
    throw new Error(`You can only have ${MAX_ACTIVE_RESERVATIONS} active reservation at a time. Please pick up your current reservation before making a new one.`);
  }

  // Validate offer availability & fetch offer atomically for constraints
  const { data: offerData, error: offerError } = await supabase
    .from('offers')
    .select('id, quantity_available, pickup_start, pickup_end, expires_at, status, partner_id')
    .eq('id', offerId)
    .single();

  if (offerError || !offerData) {
    throw new Error('Offer not found');
  }
  if (offerData.status !== 'ACTIVE') {
    throw new Error('Offer is not active');
  }

  // 🛡️ CRITICAL: Check expires_at first (primary expiration)
  const now = new Date();
  if (offerData.expires_at && new Date(offerData.expires_at) <= now) {
    throw new Error('Offer has expired');
  }

  // Check pickup window validity - business must be open
  if (offerData.pickup_start && new Date(offerData.pickup_start) > now) {
    const pickupStart = new Date(offerData.pickup_start);
    const hours = pickupStart.getHours();
    const minutes = pickupStart.getMinutes();
    throw new Error(`BUSINESS_CLOSED:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  }
  if (offerData.pickup_end && new Date(offerData.pickup_end) <= now) {
    throw new Error('Pickup window has ended');
  }

  if (quantity > offerData.quantity_available) {
    throw new Error('Requested quantity exceeds availability');
  }

  // Get user's max reservation quantity (respects purchased slots)
  const { data: userSlotData, error: slotError } = await supabase
    .from('users')
    .select('max_reservation_quantity')
    .eq('id', customerId)
    .single();

  if (slotError) {
    throw new Error('Failed to verify user reservation limit');
  }

  const userMaxQuantity = userSlotData?.max_reservation_quantity || MAX_RESERVATION_QUANTITY;

  // Enforce user's maximum quantity limit
  if (quantity > userMaxQuantity) {
    throw new Error(`You can reserve up to ${userMaxQuantity} items per offer. Unlock more slots in your profile!`);
  }

  // Validate quantity is positive
  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  // Generate unique QR code using cryptographically secure random
  // Use 64 bits of randomness (16 hex chars) + timestamp tag for traceability
  const generateQrCode = (): string => {
    const ts = Date.now().toString(36).toUpperCase();
    const buf = new Uint8Array(8);
    crypto.getRandomValues(buf);
    const hex = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `SP-${ts}-${hex}`; // e.g., SP-LZ4XMM-3FA2C1... (short, high-entropy)
  };

  // Set expiration to 1 hour from now
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + RESERVATION_HOLD_MINUTES);

  // Get offer to calculate price
  const offer = await getOfferById(offerId);
  if (!offer) {
    throw new Error('Offer not found');
  }

  const totalPrice = offer.smart_price * quantity;

  // Use atomic database function to prevent race conditions
  // This function locks the offer row and updates quantity in a single transaction
  // We also retry on unique QR collisions if the database has a UNIQUE(qr_code) constraint
  
  // CSRF Protection: Get token before critical operation
  const { getCSRFToken } = await import('@/lib/csrf');
  const csrfToken = await getCSRFToken();
  if (!csrfToken) {
    throw new Error('Security token required. Please refresh the page and try again.');
  }
  
  let data: Reservation | null = null;
  let error: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const qrCode = generateQrCode();
    ({ data, error } = await supabase.rpc('create_reservation_atomic', {
      p_offer_id: offerId,
      p_quantity: quantity,
      p_qr_code: qrCode,
      p_total_price: totalPrice,
      p_expires_at: expiresAt.toISOString(),
    }));

    // If function missing or still expecting p_customer_id, retry legacy signature
    if (
      error && (
        /p_customer_id|function create_reservation_atomic/i.test(error.message || '') ||
        /could not find the function|404 not found|pgrst116/i.test(error.message || '')
      )
    ) {
      const legacy = await supabase.rpc('create_reservation_atomic', {
        p_offer_id: offerId,
        p_customer_id: customerId,
        p_quantity: quantity,
        p_qr_code: qrCode,
        p_total_price: totalPrice,
        p_expires_at: expiresAt.toISOString(),
      });
      data = legacy.data;
      error = legacy.error;
    }

    // On unique violation (23505) retry with a fresh QR
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : '';
    const msg = error?.message || '';
    if (code === '23505' || /unique|duplicate key value|qr_code/i.test(msg)) {
      // brief jitter to avoid same-ms repetition in rare cases
      await new Promise(r => setTimeout(r, 10 + Math.floor(Math.random() * 20)));
      continue;
    }

    // Success or non-unique error -> break loop
    break;
  }

  if (error) {
    const msg = error.message || '';
    if (msg.includes('Insufficient quantity')) {
      throw new Error(ERROR_MESSAGES.INSUFFICIENT_QUANTITY);
    } else if (msg.includes('not active') || msg.includes('expired')) {
      throw new Error(ERROR_MESSAGES.OFFER_EXPIRED);
    } else if (/could not find the function|404 not found|pgrst116/i.test(msg)) {
      throw new Error(
        'Reservation system migration not applied yet. Please run supabase/migrations/20251107_secure_reservation_function.sql.'
      );
    } else if (msg.includes('Authentication required')) {
      throw new Error('Please sign in again to reserve this offer.');
    }
    throw error;
  }

  // Function now returns full reservation with relations (no N+1 query)
  const reservation = data;

  // Send Telegram notifications (don't block on these)
  if (reservation) {
    // Fetch full details for notifications if not already loaded
    const { data: fullReservation } = await supabase
      .from('reservations')
      .select(`
        *,
        offer:offers (
          title,
          quantity_total,
          partner_id,
          partner:partners (
            business_name,
            address,
            user_id
          )
        )
      `)
      .eq('id', reservation.id)
      .single();

    if (fullReservation) {
      const customerName = 'Customer'; // We don't store customer names in reservations
      const offerTitle = fullReservation.offer?.title || 'Offer';
      const pickupBy = new Date(fullReservation.expires_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const partnerName = fullReservation.offer?.partner?.business_name || 'Partner';
      const partnerAddress = fullReservation.offer?.partner?.address || 'Address not available';
      const partnerId = fullReservation.offer?.partner_id; // UUID of partner record
      const partnerUserId = fullReservation.offer?.partner?.user_id; // UUID of partner's user account

      // Notify partner about new reservation
      if (partnerUserId) {
        // Firebase push notification (primary) - MUST use user_id, not partner_id
        notifyPartnerPush(
          partnerUserId,
          customerName,
          offerTitle,
          quantity
        ).catch(err => logger.warn('Push notification failed:', err));

        // Telegram notification (optional backup)
        notifyPartnerTelegram(
          partnerId,
          customerName,
          customerId, // Pass customer ID
          offerTitle,
          quantity,
          pickupBy
        ).catch(err => logger.warn('Telegram notification unavailable'));

        // Check if stock is low and notify partner
        const remainingQuantity = fullReservation.offer?.quantity_available || 0;
        if (remainingQuantity <= 2 && remainingQuantity > 0) {
          notifyPartnerLowStockTelegram(
            partnerId,
            partnerId, // Pass partner UUID
            offerTitle,
            remainingQuantity
          ).catch(err => logger.warn('Low stock notification unavailable'));
        }
      }

      // Notify customer about reservation confirmation
      // Firebase push notification (primary)
      notifyCustomerPush(
        customerId,
        offerTitle,
        partnerName,
        pickupBy
      ).catch(err => logger.warn('Push notification failed:', err));

      // Telegram notification (optional backup)
      notifyCustomerTelegram(
        customerId,
        offerTitle,
        quantity,
        partnerName,
        partnerAddress,
        pickupBy
      ).catch(err => logger.warn('Telegram notification unavailable'));
    }
  }

  return reservation as Reservation;
};

export const getReservationById = async (reservationId: string, retryCount = 0): Promise<Reservation | null> => {
  if (isDemoMode) {
    return null;
  }

  logger.info(`Fetching reservation ${reservationId} (attempt ${retryCount + 1})`);

  // First try to get the basic reservation data
  const { data: basicData, error: basicError } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .maybeSingle();

  if (basicError) {
    logger.error(`Error fetching reservation ${reservationId}:`, basicError);
    throw basicError;
  }

  if (!basicData) {
    // More aggressive retry - up to 5 attempts with shorter delays for new reservations
    if (retryCount < 5) {
      const delay = retryCount === 0 ? 100 : 500; // Fast first retry, then 500ms
      logger.info(`Reservation ${reservationId} not found, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return getReservationById(reservationId, retryCount + 1);
    }
    logger.warn(`Reservation ${reservationId} not found after ${retryCount + 1} attempts`);
    return null;
  }

  // Then fetch the related data separately to avoid RLS issues
  const [offerResult, partnerResult] = await Promise.allSettled([
    supabase.from('offers').select('*').eq('id', basicData.offer_id).maybeSingle(),
    supabase.from('partners').select('*').eq('id', basicData.partner_id).maybeSingle()
  ]);

  const offer = offerResult.status === 'fulfilled' ? offerResult.value.data : null;
  const partner = partnerResult.status === 'fulfilled' ? partnerResult.value.data : null;

  // Log if partner data is missing (RLS issue or partner not found)
  if (!partner) {
    if (partnerResult.status === 'rejected') {
      logger.error(`❌ Failed to fetch partner ${basicData.partner_id}:`, partnerResult.reason);
    } else if (partnerResult.status === 'fulfilled' && partnerResult.value.error) {
      logger.error(`❌ Partner fetch error:`, partnerResult.value.error);
    } else {
      logger.warn(`⚠️ Partner ${basicData.partner_id} not found (may be deleted or RLS restricted)`);
    }
  }

  const reservation = {
    ...basicData,
    offer: offer || undefined,
    partner: partner || undefined
  } as Reservation;

  logger.info(`Successfully fetched reservation ${reservationId}`, reservation);

  return reservation;
};

export const getCustomerReservations = async (customerId: string): Promise<Reservation[]> => {
  if (isDemoMode) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      offer:offers(
        *,
        partner:partners(*)
      ),
      partner:partners(*)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Reservation[];
};

export const getPartnerReservations = async (partnerId: string): Promise<Reservation[]> => {
  if (isDemoMode) {
    return [];
  }

  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      offer:offers(*)
    `)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Reservation[];
};

export const validateQRCode = async (qrCode: string, autoMarkAsPickedUp: boolean = false): Promise<QRValidationResult> => {
  if (isDemoMode) {
    return { valid: false, error: 'Demo mode: Please configure Supabase' };
  }

  // Basic format sanity check (prefix + length)
  const normalized = qrCode.trim();
  if (!/^SP-/i.test(normalized)) {
    return { valid: false, error: 'Unrecognized QR code format' };
  }
  if (normalized.length < 8) {
    return { valid: false, error: 'QR code too short' };
  }

  // Validate and pickup using Edge Function (has service_role to handle points)
  if (autoMarkAsPickedUp) {
    try {
      logger.debug('🔍 QR Scanner: Validating and marking as picked up:', qrCode);
      
      // First, find the reservation by QR code
      const { data: reservation, error: findError } = await supabase
        .from('reservations')
        .select('id, status, expires_at, partner_id')
        .eq('qr_code', qrCode)
        .eq('status', 'ACTIVE')
        .single();

      if (findError || !reservation) {
        logger.error('QR validation: reservation not found', { error: findError, qrCode });
        return { valid: false, error: 'Invalid or expired QR code' };
      }

      logger.debug('✅ Found reservation:', reservation.id);

      // Get auth session for Edge Function
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        logger.error('QR validation: not authenticated', { error: sessionError });
        return { valid: false, error: 'Not authenticated' };
      }

      // Call Edge Function to mark as picked up (handles points transfer)
      const { data: functionResult, error: functionError } = await supabase.functions.invoke('mark-pickup', {
        body: { reservation_id: reservation.id },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (functionError) {
        logger.error('QR validation: Edge Function error', { error: functionError });
        return { valid: false, error: functionError.message || 'Failed to mark as picked up' };
      }

      if (!functionResult?.success) {
        logger.error('QR validation: Edge Function returned error', { result: functionResult });
        return { valid: false, error: functionResult?.error || 'Failed to mark as picked up' };
      }

      logger.debug('✅ Successfully marked as picked up via QR scan');

      // Fetch updated reservation with full details
      const { data: fetched, error: fetchError } = await supabase
        .from('reservations')
        .select('*, offer:offers(*), partner:partners(*)')
        .eq('id', reservation.id)
        .single();

      if (fetchError) {
        logger.error('QR validation: failed to fetch updated reservation', { error: fetchError });
        return { valid: false, error: 'Pickup successful but failed to fetch details' };
      }

      return { valid: true, reservation: fetched as Reservation };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to validate/pickup';
      logger.error('QR validation exception', { error: e, qrCode });
      return { valid: false, error: errorMessage };
    }
  }

  // Legacy read-only validation path (no pickup)
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      offer:offers(*),
      partner:partners(*)
    `)
    .eq('qr_code', qrCode)
    .eq('status', 'ACTIVE')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error) {
    logger.error('Supabase error:', error);
    return { valid: false, error: `Database error: ${error.message}` };
  }

  if (!data) {
    return { valid: false, error: 'Invalid or expired QR code' };
  }

  return { valid: true, reservation: data as Reservation };
};

export const markAsPickedUp = async (reservationId: string): Promise<Reservation> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }

  logger.debug('🔍 Marking reservation as picked up (using RPC):', reservationId);

  // Use RPC function with SECURITY DEFINER (apply migration 20251220_partner_mark_pickup_rpc.sql)
  const { data, error } = await supabase.rpc('partner_mark_reservation_picked_up', {
    p_reservation_id: reservationId
  });

  if (error) {
    logger.error('❌ RPC error:', error);
    throw new Error(error.message || 'Failed to mark as picked up');
  }

  if (!data || data.length === 0) {
    throw new Error('Reservation not found');
  }

  const reservation = data[0] as Reservation;
  logger.debug('✅ Marked as picked up successfully');
  
  // 🚀 BROADCAST pickup confirmation to customer (lightweight, real-time)
  // Customer listens to this channel when QR modal is open
  try {
    logger.debug('📢 Attempting to broadcast to channel:', `pickup-${reservationId}`);
    const channel = supabase.channel(`pickup-${reservationId}`);
    
    // Subscribe first, then send
    await new Promise((resolve, reject) => {
      channel.subscribe(async (status) => {
        logger.debug('📡 Partner broadcast channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          try {
            await channel.send({
              type: 'broadcast',
              event: 'pickup_confirmed',
              payload: {
                reservationId,
                savedAmount: reservation.total_price || 0,
                timestamp: new Date().toISOString()
              }
            });
            logger.debug('✅ Broadcast sent successfully to customer');
            resolve(true);
          } catch (sendError) {
            logger.error('❌ Failed to send broadcast:', sendError);
            reject(sendError);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error('Channel subscription failed'));
        }
      });
      
      // Timeout after 3 seconds
      setTimeout(() => reject(new Error('Broadcast timeout')), 3000);
    });
    
    // Cleanup channel after sending
    setTimeout(() => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    }, 2000);
  } catch (broadcastError) {
    // Non-critical - customer will see via polling fallback
    logger.warn('⚠️ Broadcast failed (non-critical):', broadcastError);
  }
  
  return reservation;

  if (!functionResult?.success) {
    logger.error('❌ Edge Function returned error:', {
      result: functionResult,
      reservationId,
      errorMessage: functionResult?.error
    });
    throw new Error(functionResult?.error || 'Failed to mark as picked up');
  }

  logger.debug('✅ Successfully marked as picked up:', functionResult);

  // Fetch updated reservation with full details
  const { data: updatedReservation, error: fetchError } = await supabase
    .from('reservations')
    .select(`
      *,
      offer:offers(*),
      partner:partners(*)
    `)
    .eq('id', reservationId)
    .single();

  if (fetchError) {
    logger.error('Failed to fetch updated reservation:', fetchError);
    throw fetchError;
  }

  return updatedReservation as Reservation;
};

export const cancelReservation = async (reservationId: string): Promise<void> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }

  // CSRF Protection for cancellation (involves refunds)
  const { getCSRFToken } = await import('@/lib/csrf');
  const csrfToken = await getCSRFToken();
  if (!csrfToken) {
    throw new Error('Security token required. Please refresh the page and try again.');
  }

  // Get reservation details including user ID
  const { data: reservation } = await supabase
    .from('reservations')
    .select('offer_id, quantity, customer_id, status')
    .eq('id', reservationId)
    .single();

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  // For history items (PICKED_UP, EXPIRED, CANCELLED), DELETE them completely
  const isHistoryItem = ['PICKED_UP', 'EXPIRED', 'CANCELLED'].includes(reservation.status);

  if (isHistoryItem) {
    logger.log(`Deleting ${reservation.status} reservation from history`);
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', reservationId);

    if (error) throw error;
    return;
  }

  // For ACTIVE reservations - NO REFUND (penalty), restore quantity, notify partner
  logger.log('Cancelling active reservation - NO POINT REFUND (penalty policy)');

  // Restore offer quantity to partner
  const { data: offer } = await supabase
    .from('offers')
    .select('quantity_available, partner_id, title, partner:partners(user_id)')
    .eq('id', reservation.offer_id)
    .single();

  if (offer) {
    await supabase
      .from('offers')
      .update({ quantity_available: offer.quantity_available + reservation.quantity })
      .eq('id', reservation.offer_id);

    // Get customer name from users table instead of auth.admin (which requires service role)
    const { data: userData } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', reservation.customer_id)
      .single();
    
    const customerName = userData?.name || userData?.email?.split('@')[0] || 'Customer';
    const partnerUserId = (offer.partner as any)?.user_id;

    // Notify partner about cancellation (fire-and-forget)
    if (partnerUserId) {
      // Firebase push notification (primary) - MUST use user_id, not partner_id
      const { notifyPartnerReservationCancelled: notifyPartnerCancelledPush } = await import('@/lib/pushNotifications');
      notifyPartnerCancelledPush(
        partnerUserId,
        customerName,
        offer.title,
        reservation.quantity
      ).catch(err => {
        logger.log('Push notification failed (non-blocking):', err);
      });

      // Telegram notification (optional backup)
      const { notifyPartnerReservationCancelled } = await import('@/lib/telegram');
      notifyPartnerReservationCancelled(
        offer.partner_id,
        offer.partner_id, // Pass partner UUID
        customerName,
        reservation.customer_id, // Pass customer ID
        offer.title,
        reservation.quantity
      ).catch(err => {
        logger.log('Telegram notification failed (non-blocking):', err);
      });
    }
  }

  // NO POINT REFUND - User loses points as penalty for cancellation
  logger.log('Points NOT refunded - cancellation penalty applied');

  // Mark active reservation as cancelled
  // Note: Cancellation tracking happens automatically via database trigger
  const { error } = await supabase
    .from('reservations')
    .update({ status: 'CANCELLED' })
    .eq('id', reservationId);

  if (error) throw error;
};

/**
 * Auto-cleanup old history items (PICKED_UP, EXPIRED, CANCELLED) older than 10 days
 */
export const cleanupOldHistory = async (userId: string): Promise<void> => {
  if (isDemoMode) return;

  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  await supabase
    .from('reservations')
    .delete()
    .eq('customer_id', userId)
    .in('status', ['PICKED_UP', 'EXPIRED', 'CANCELLED'])
    .lt('updated_at', tenDaysAgo.toISOString());
};

/**
 * Clear ALL history items (PICKED_UP, EXPIRED, CANCELLED) for a user.
 * Unlike cleanupOldHistory (time-based), this is an explicit user action.
 */
export const clearAllHistory = async (userId: string): Promise<void> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }

  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('customer_id', userId)
    .in('status', ['PICKED_UP', 'EXPIRED', 'CANCELLED']);

  if (error) throw error;
};

/**
 * 🚀 PHASE 2 OPTIMIZATION: Unified Customer Dashboard Data
 * Replaces 2 separate queries with 1 RPC call
 * Saves 50% of customer dashboard queries
 */
export interface CustomerDashboardData {
  user: any;
  reservations: Reservation[];
  points: any;
  stats: {
    totalReservations: number;
    activeReservations: number;
    completedReservations: number;
    cancelledReservations: number;
    totalSaved: number;
  };
}

export const getCustomerDashboardData = async (userId: string): Promise<CustomerDashboardData> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Dashboard data not available');
  }

  try {
    const { data, error } = await supabase.rpc('get_customer_dashboard_data', {
      p_user_id: userId
    });

    if (error) {
      logger.error('Failed to fetch customer dashboard data:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No dashboard data returned');
    }

    logger.info('✅ Customer dashboard data loaded in single query');

    return {
      user: data.user,
      reservations: data.reservations,
      points: data.points,
      stats: data.stats
    };
  } catch (error) {
    logger.error('Error in getCustomerDashboardData:', error);
    throw error;
  }
};
