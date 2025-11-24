import { supabase, isDemoMode } from '../supabase';
import { Reservation } from '../types';
import {
  MAX_RESERVATION_QUANTITY,
  MAX_ACTIVE_RESERVATIONS,
  RESERVATION_HOLD_MINUTES,
  ERROR_MESSAGES,
} from '../constants';
import { notifyPartnerNewReservation, notifyCustomerReservationConfirmed } from '../telegram';
import { logger } from '../logger';
import { checkUserPenalty } from './penalties';
import { getOfferById } from './offers';

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

  // Check penalty status
  const penaltyInfo = await checkUserPenalty(customerId);
  if (penaltyInfo.isUnderPenalty) {
    throw new Error(`You are currently under penalty until ${penaltyInfo.penaltyUntil?.toLocaleString()}. Remaining time: ${penaltyInfo.remainingTime}`);
  }

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
    .select('id, quantity_available, pickup_start, pickup_end, status, partner_id')
    .eq('id', offerId)
    .single();

  if (offerError || !offerData) {
    throw new Error('Offer not found');
  }
  if (offerData.status !== 'ACTIVE') {
    throw new Error('Offer is not active');
  }

  // Check pickup window validity
  const now = new Date();
  if (offerData.pickup_start && new Date(offerData.pickup_start) > now) {
    throw new Error('Pickup window has not started yet');
  }
  if (offerData.pickup_end && new Date(offerData.pickup_end) <= now) {
    throw new Error('Offer has expired');
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
    const customerName = reservation.customer?.name || 'Customer';
    const offerTitle = reservation.offer?.title || 'Offer';
    const pickupBy = new Date(reservation.expires_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const partnerName = reservation.partner?.business_name || 'Partner';
    const partnerAddress = reservation.partner?.address || 'Address not available';

    // Notify partner about new reservation
    // Note: notification_preferences uses user_id, not partner_id
    const partnerUserId = reservation.partner?.user_id;
    if (partnerUserId) {
      notifyPartnerNewReservation(
        partnerUserId,
        customerName,
        offerTitle,
        quantity,
        pickupBy
      ).catch(err => console.warn('Notification service unavailable'));
    }

    // Notify customer about reservation confirmation
    notifyCustomerReservationConfirmed(
      customerId,
      offerTitle,
      quantity,
      partnerName,
      partnerAddress,
      pickupBy
    ).catch(err => console.warn('Notification service unavailable'));
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
    // Retry a few times in case of brief RLS propagation delay
    if (retryCount < 2) {
      logger.info(`Reservation ${reservationId} not found, retrying...`);
      await new Promise(r => setTimeout(r, 300));
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
      offer:offers(*),
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
      console.log('🔍 QR Scanner: Validating and marking as picked up:', qrCode);
      
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

      console.log('✅ Found reservation:', reservation.id);

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

      console.log('✅ Successfully marked as picked up via QR scan');

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
    console.error('Supabase error:', error);
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

  console.log('🔍 Marking reservation as picked up (using Edge Function):', reservationId);

  // Get auth session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('Not authenticated');
  }

  // Call Edge Function (has service_role permissions to award points)
  const { data: functionResult, error: functionError } = await supabase.functions.invoke('mark-pickup', {
    body: { reservation_id: reservationId },
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (functionError) {
    console.error('❌ Edge Function ERROR:', functionError);
    throw new Error(functionError.message || 'Failed to mark as picked up');
  }

  if (!functionResult?.success) {
    console.error('❌ Edge Function returned error:', functionResult);
    throw new Error(functionResult?.error || 'Failed to mark as picked up');
  }

  console.log('✅ Successfully marked as picked up:', functionResult);

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
    console.error('Failed to fetch updated reservation:', fetchError);
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

  // For ACTIVE reservations - refund points and restore quantity before cancelling
  logger.log('Cancelling active reservation with refund');

  // Restore offer quantity
  const { data: offer } = await supabase
    .from('offers')
    .select('quantity_available')
    .eq('id', reservation.offer_id)
    .single();

  if (offer) {
    await supabase
      .from('offers')
      .update({ quantity_available: offer.quantity_available + reservation.quantity })
      .eq('id', reservation.offer_id);
  }

  // REFUND POINTS - Give back points based on quantity (5 points per unit)
  const POINTS_PER_RESERVATION = 5;
  const totalPointsToRefund = POINTS_PER_RESERVATION * reservation.quantity;

  logger.log('Attempting to refund points:', {
    userId: reservation.customer_id,
    amount: totalPointsToRefund,
    quantity: reservation.quantity,
    reservationId
  });

  const { data: refundResult, error: refundError } = await supabase.rpc('add_user_points', {
    p_user_id: reservation.customer_id,
    p_amount: totalPointsToRefund,
    p_reason: 'refund',
    p_metadata: {
      reservation_id: reservationId,
      offer_id: reservation.offer_id,
      quantity: reservation.quantity,
      points_refunded: totalPointsToRefund,
      cancelled_at: new Date().toISOString()
    }
  });

  if (refundError) {
    console.error('❌ Error refunding points:', refundError);
    console.error('Full refund error details:', JSON.stringify(refundError, null, 2));
    // Don't throw - still cancel the reservation even if refund fails
  } else {
    logger.log('Points refunded successfully:', refundResult);
  }

  // Mark active reservation as cancelled
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
