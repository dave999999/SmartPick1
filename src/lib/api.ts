// Partner analytics exports
export { getPartnerAnalytics, getPartnerPayoutInfo } from './api/partner-analytics';
import { supabase, isDemoMode } from './supabase';
import { Offer, Reservation, Partner, CreateOfferDTO, OfferFilters, User, PenaltyInfo } from './types';
import { mockOffers, mockPartners } from './mockData';
import QRCode from 'qrcode';
import {
  MAX_RESERVATION_QUANTITY,
  MAX_ACTIVE_RESERVATIONS,
  RESERVATION_HOLD_MINUTES,
  PENALTY_FIRST_OFFENSE_HOURS,
  PENALTY_SECOND_OFFENSE_HOURS,
  PENALTY_THIRD_OFFENSE_HOURS,
  PENALTY_REPEAT_OFFENSE_HOURS,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  ERROR_MESSAGES,
  IMAGE_CACHE_MAX_AGE,
  QR_CODE_SIZE,
  QR_CODE_MARGIN,
} from './constants';
import { notifyPartnerNewReservation, notifyCustomerReservationConfirmed, notifyPartnerPickupComplete } from './telegram';
import { logger } from './logger';

// Auth functions
export const getCurrentUser = async (): Promise<{ user: User | null; error?: unknown }> => {
  if (isDemoMode) {
    return { user: null };
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) return { user: null, error };
    if (!user) return { user: null };

    // Try to read public profile; if missing, create a minimal record for resilience
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!userData) {
      // Retry with exponential backoff waiting for trigger (total ~4.5s)
      const delays = [200, 400, 800, 1200, 1900];
      for (const d of delays) {
        await new Promise(r => setTimeout(r, d));
        const { data: retry } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (retry) {
          return { user: retry as User };
        }
      }

      // Fallback: call RPC to ensure profile exists (handles late trigger failure)
      const { data: ensured, error: ensureError } = await supabase.rpc('ensure_user_profile');
      if (ensured) {
        return { user: ensured as User };
      }
      console.warn('Profile row missing for auth user after ensure_user_profile()', user.id, ensureError);
      return { user: null, error: ensureError || new Error('Profile not found after signup') };
    }

    if (userError) return { user: null, error: userError };
    return { user: userData as User };
  } catch (error) {
    return { user: null, error };
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  if (isDemoMode) {
    return { 
      data: null, 
      error: new Error('Demo mode: Please configure Supabase to enable authentication') 
    };
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string, name: string) => {
  if (isDemoMode) {
    return { 
      data: null, 
      error: new Error('Demo mode: Please configure Supabase to enable authentication') 
    };
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });
  return { data, error };
};

export const signInWithGoogle = async () => {
  if (isDemoMode) {
    return { 
      data: null, 
      error: new Error('Demo mode: Please configure Supabase to enable authentication') 
    };
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  });
  return { data, error };
};

export const signOut = async () => {
  if (isDemoMode) {
    return { error: null };
  }

  const { error } = await supabase.auth.signOut();
  return { error };
};

// Update user profile
export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  if (isDemoMode) {
    return { data: null, error: new Error('Demo mode') };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        name: updates.name,
        phone: updates.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { data: null, error };
  }
};

// Penalty System Functions
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

// Offers API
export const getActiveOffers = async (filters?: OfferFilters): Promise<Offer[]> => {
  if (isDemoMode) {
    // 🔹 Demo mode: filter mock offers too
    let filtered = [...mockOffers];
    if (filters?.category) {
      filtered = filtered.filter(o => o.category === filters.category);
    }

    // 🔹 Hide sold-out mock offers
    filtered = filtered.filter(o => (o.quantity_available ?? 0) > 0);

    return filtered;
  }

  // 🔹 Build query to get only ACTIVE offers that are not expired AND have stock
  // 🔹 ONLY show offers from APPROVED partners (hide offers from PAUSED/BLOCKED partners)
  let query = supabase
    .from('offers')
    .select(`
      *,
      partner:partners!inner(*)
    `)
    .eq('status', 'ACTIVE')                               // only active offers
    .eq('partner.status', 'APPROVED')                     // 🔒 only approved partners
    .gt('expires_at', new Date().toISOString())            // not expired
    .gt('quantity_available', 0)                           // 🧠 hide sold-out offers
    .order('created_at', { ascending: false });             // newest first

  // 🔹 Apply category filter if provided
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching active offers:', error);
    throw error;
  }

  // 🔹 Ensure we return an empty array instead of null
  return (data ?? []) as Offer[];
};


export const getOfferById = async (id: string): Promise<Offer> => {
  if (isDemoMode) {
    const offer = mockOffers.find(o => o.id === id);
    if (!offer) throw new Error('Offer not found');
    return offer;
  }
  
  const { data, error } = await supabase
    .from('offers')
    .select(`
      *,
      partner:partners(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Offer;
};

export const createOffer = async (offerData: CreateOfferDTO, partnerId: string): Promise<Offer> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase to create offers');
  }
  // Basic validation & normalization
  if (!partnerId) throw new Error('partnerId required');
  if (!offerData.title || offerData.title.trim().length < 3) throw new Error('Title too short');
  if (offerData.smart_price <= 0 || offerData.original_price <= 0) throw new Error('Prices must be positive');
  if (offerData.smart_price >= offerData.original_price) throw new Error('Smart price must be less than original price');
  if (offerData.quantity_total <= 0) throw new Error('Quantity must be > 0');

  // Check if partner has available slots
  const { data: activeOffers } = await supabase
    .from('offers')
    .select('id')
    .eq('partner_id', partnerId)
    .eq('status', 'ACTIVE');

  const { data: partnerPoints } = await supabase
    .from('partner_points')
    .select('offer_slots')
    .eq('user_id', partnerId)  // Column is named user_id, not partner_id
    .maybeSingle();

  const maxSlots = partnerPoints?.offer_slots || 4;
  const activeCount = activeOffers?.length || 0;

  if (activeCount >= maxSlots) {
    throw new Error(`You've reached your maximum of ${maxSlots} active offers. Purchase more slots or deactivate an existing offer.`);
  }

  // Defensive: ensure pickup window makes sense
  const start = offerData.pickup_window.start;
  const end = offerData.pickup_window.end;
  if (end <= start) throw new Error('Pickup end must be after start');
  const now = new Date();
  if (start < now) {
    // Allow slight clock skew (5 min)
    const skewMs = 5 * 60 * 1000;
    if (now.getTime() - start.getTime() > skewMs) {
      throw new Error('Pickup start must be in the future');
    }
  }

  // Upload images first (empty array supported)
  const imageUrls = offerData.images && offerData.images.length
    ? await uploadImages(offerData.images, 'offer-images')
    : [];

  const insertData = {
    partner_id: partnerId,
    title: offerData.title.trim(),
    description: offerData.description.trim(),
    category: offerData.category,
    images: imageUrls,
    original_price: Number(offerData.original_price),
    smart_price: Number(offerData.smart_price),
    quantity_available: Number(offerData.quantity_total),
    quantity_total: Number(offerData.quantity_total),
    pickup_start: offerData.pickup_window.start.toISOString(),
    pickup_end: offerData.pickup_window.end.toISOString(),
    status: 'ACTIVE' as const,
    expires_at: offerData.pickup_window.end.toISOString(),
  };

  console.log('Creating offer with data:', insertData);

  const { data, error } = await supabase
    .from('offers')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Offer creation error:', error);
    throw new Error(`Failed to create offer: ${error.message}`);
  }
  return data as Offer;
};

export const updateOffer = async (id: string, updates: Partial<Offer>): Promise<Offer> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase to update offers');
  }
  
  const { data, error } = await supabase
    .from('offers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Offer;
};

export const deleteOffer = async (id: string): Promise<void> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase to delete offers');
  }
  
  const { error } = await supabase
    .from('offers')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Reservations API
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

  // Enforce maximum quantity limit
  if (quantity > MAX_RESERVATION_QUANTITY) {
    throw new Error(ERROR_MESSAGES.MAX_RESERVATIONS_REACHED);
  }

  // Validate quantity is positive
  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  // Generate unique QR code using cryptographically secure random
  const timestamp = Date.now();
  const randomPart = crypto.randomUUID().substring(0, 8).toUpperCase();
  const qrCode = `SP-${timestamp.toString(36).toUpperCase()}-${randomPart}`;

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
  // Attempt secure signature (no p_customer_id; server derives auth.uid())
  let { data, error } = await supabase.rpc('create_reservation_atomic', {
    p_offer_id: offerId,
    p_quantity: quantity,
    p_qr_code: qrCode,
    p_total_price: totalPrice,
    p_expires_at: expiresAt.toISOString(),
  });

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

  // Fetch the complete reservation with relations
  const { data: reservation, error: fetchError } = await supabase
    .from('reservations')
    .select(`
      *,
      offer:offers(*),
      partner:partners(*),
      customer:users(name, email, id)
    `)
    .eq('id', data.id)
    .single();

  if (fetchError) throw fetchError;

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
      ).catch(err => console.error('Failed to send partner notification:', err));
    }

    // Notify customer about reservation confirmation
    notifyCustomerReservationConfirmed(
      customerId,
      offerTitle,
      quantity,
      partnerName,
      partnerAddress,
      pickupBy
    ).catch(err => console.error('Failed to send customer notification:', err));
  }

  return reservation as Reservation;
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
      offer:offers(*),
      customer:users(name, email)
    `)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Reservation[];
};

interface QRValidationResult { valid: boolean; reservation?: Reservation; error?: string }
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
        .select('*, offer:offers(*), customer:users(name, email), partner:partners(*)')
        .eq('id', reservation.id)
        .single();

      if (fetchError) {
        logger.error('QR validation: failed to fetch updated reservation', { error: fetchError });
        return { valid: false, error: 'Pickup successful but failed to fetch details' };
      }

      return { valid: true, reservation: fetched as Reservation };
    } catch (e: any) {
      logger.error('QR validation exception', { error: e, qrCode });
      return { valid: false, error: e.message || 'Failed to validate/pickup' };
    }
  }

  // Legacy read-only validation path (no pickup)
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      offer:offers(*),
      customer:users(name, email),
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
      customer:users(name, email),
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

  try {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('customer_id', userId)
      .in('status', ['PICKED_UP', 'EXPIRED', 'CANCELLED'])
      .lt('created_at', tenDaysAgo.toISOString());

    if (error) {
      console.error('Error cleaning up old history:', error);
    } else {
      logger.log('Auto-cleaned old history items (10+ days)');
    }
  } catch (error) {
    console.error('Error in cleanupOldHistory:', error);
  }
};

/**
 * Clear all history items for a user (PICKED_UP, EXPIRED, CANCELLED)
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

// Partners API
export const getPartnerByUserId = async (userId: string): Promise<Partner | null> => {
  if (isDemoMode) {
    return null;
  }

  // Use maybeSingle() instead of single() to avoid 406 errors when no partner exists
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching partner by user_id:', error);
    return null;
  }
  return data as Partner;
};

export const createPartnerApplication = async (partnerData: Partial<Partner>): Promise<Partner> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }
  
  const { data, error } = await supabase
    .from('partners')
    .insert({
      ...partnerData,
      status: 'PENDING', // Explicitly set status to PENDING
    })
    .select()
    .single();

  if (error) throw error;
  return data as Partner;
};

export const getPartnerOffers = async (partnerId: string): Promise<Offer[]> => {
  if (isDemoMode) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Offer[];
};

export const relistOffer = async (offerId: string) => {
  try {
    // Get the original offer
    const { data: offer, error: getError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();
    
    if (getError) throw getError;

    // Create a new offer with the same details
    const { data: newOffer, error: createError } = await supabase
      .from('offers')
      .insert({
        ...offer,
        id: undefined, // Let Supabase generate a new ID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'ACTIVE',
        quantity_available: offer.quantity_total,
      })
      .select()
      .single();

    if (createError) throw createError;
    return newOffer;
  } catch (error) {
    console.error('Error relisting offer:', error);
    throw error;
  }
};

export const getPartnerStats = async (partnerId: string) => {
  if (isDemoMode) {
    return { activeOffers: 0, reservationsToday: 0, itemsPickedUp: 0 };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: activeOffers } = await supabase
    .from('offers')
    .select('id', { count: 'exact' })
    .eq('partner_id', partnerId)
    .eq('status', 'ACTIVE');

  const { data: reservationsToday } = await supabase
    .from('reservations')
    .select('id', { count: 'exact' })
    .eq('partner_id', partnerId)
    .gte('created_at', today.toISOString());

  const { data: pickedUpToday } = await supabase
    .from('reservations')
    .select('id', { count: 'exact' })
    .eq('partner_id', partnerId)
    .eq('status', 'PICKED_UP')
    .gte('picked_up_at', today.toISOString());

  return {
    activeOffers: activeOffers?.length || 0,
    reservationsToday: reservationsToday?.length || 0,
    itemsPickedUp: pickedUpToday?.length || 0,
  };
};

// Admin API
export const getPendingPartners = async (): Promise<Partner[]> => {
  if (isDemoMode) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as Partner[];
};

export const approvePartner = async (partnerId: string): Promise<void> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }
  
  const { error } = await supabase
    .from('partners')
    .update({ status: 'APPROVED' })
    .eq('id', partnerId);

  if (error) throw error;
};

export const rejectPartner = async (partnerId: string): Promise<void> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }
  
  const { error } = await supabase
    .from('partners')
    .update({ status: 'REJECTED' })
    .eq('id', partnerId);

  if (error) throw error;
};

export const getPlatformStats = async () => {
  if (isDemoMode) {
    return {
      totalUsers: 0,
      totalPartners: 0,
      activeOffers: 0,
      dailyReservations: 0,
      dailyPickups: 0,
    };
  }
  
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const { count: totalPartners } = await supabase
    .from('partners')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'APPROVED');

  const { count: activeOffers } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ACTIVE');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: dailyReservations } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());

  const { count: dailyPickups } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PICKED_UP')
    .gte('picked_up_at', today.toISOString());

  return {
    totalUsers: totalUsers || 0,
    totalPartners: totalPartners || 0,
    activeOffers: activeOffers || 0,
    dailyReservations: dailyReservations || 0,
    dailyPickups: dailyPickups || 0,
  };
};

// Utility functions

/**
 * Validate file for upload
 * @throws Error if file is invalid
 */
const validateFile = (file: File): void => {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    throw new Error(ERROR_MESSAGES.INVALID_FILE_TYPE);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(ERROR_MESSAGES.FILE_TOO_LARGE);
  }

  // Additional security: Check for double extensions (e.g., .php.jpg)
  const fileName = file.name.toLowerCase();
  const suspiciousExtensions = ['.php', '.exe', '.sh', '.bat', '.cmd', '.js', '.html'];
  for (const ext of suspiciousExtensions) {
    if (fileName.includes(ext)) {
      throw new Error('Invalid file name. Please rename the file and try again.');
    }
  }
};

/**
 * Get safe file extension from MIME type
 */
const getExtensionFromMimeType = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return mimeToExt[mimeType] || 'jpg';
};

export const uploadImages = async (files: File[], bucket: string): Promise<string[]> => {
  if (isDemoMode) {
    return [];
  }

  const urls: string[] = [];

  for (const file of files) {
    // Validate file before upload
    validateFile(file);

    // Use MIME type for extension (more secure than trusting filename)
    const ext = getExtensionFromMimeType(file.type);
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().replace(/-/g, '').substring(0, 13);
    const fileName = `${timestamp}-${randomId}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: String(IMAGE_CACHE_MAX_AGE),
        upsert: false,
        contentType: file.type, // Explicitly set content type
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    urls.push(publicUrl);
  }

  return urls;
};

/**
 * Upload partner custom images to partner-specific directory
 * @param files - Array of File objects to upload
 * @param partnerId - Partner UUID
 * @returns Array of public URLs
 */
export const uploadPartnerImages = async (files: File[], partnerId: string): Promise<string[]> => {
  if (isDemoMode) {
    return [];
  }

  const urls: string[] = [];

  for (const file of files) {
    // Validate file before upload
    validateFile(file);

    // Use MIME type for extension (more secure than trusting filename)
    const ext = getExtensionFromMimeType(file.type);
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().replace(/-/g, '').substring(0, 13);
    const fileName = `partners/${partnerId}/uploads/${timestamp}-${randomId}.${ext}`;

    const { data, error } = await supabase.storage
      .from('offer-images') // Using the same bucket, just different path structure
      .upload(fileName, file, {
        cacheControl: String(IMAGE_CACHE_MAX_AGE),
        upsert: false,
        contentType: file.type, // Explicitly set content type
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('offer-images')
      .getPublicUrl(fileName);

    urls.push(publicUrl);
  }

  return urls;
};

/**
 * Process images for offer creation
 * Handles both library image URLs (strings) and custom uploaded files
 * @param images - Array of strings (URLs) or File objects
 * @param partnerId - Partner UUID (required for custom uploads)
 * @returns Array of image URLs
 */
export const processOfferImages = async (
  images: (string | File)[],
  partnerId: string
): Promise<string[]> => {
  if (isDemoMode) {
    return [];
  }

  const urls: string[] = [];
  const filesToUpload: File[] = [];

  // Separate library URLs from files to upload
  for (const image of images) {
    if (typeof image === 'string') {
      // It's already a URL from the library
      urls.push(image);
    } else {
      // It's a File object that needs to be uploaded
      filesToUpload.push(image);
    }
  }

  // Upload custom files if any
  if (filesToUpload.length > 0) {
    const uploadedUrls = await uploadPartnerImages(filesToUpload, partnerId);
    urls.push(...uploadedUrls);
  }

  return urls;
};

export const generateQRCodeDataURL = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text, {
      width: QR_CODE_SIZE,
      margin: QR_CODE_MARGIN,
      color: {
        dark: '#333333',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('QR Code generation error:', err);
    return '';
  }
};

// Real-time subscriptions
export const subscribeToOffers = (callback: (payload: unknown) => void) => {
  if (isDemoMode) {
    return { unsubscribe: () => {} };
  }
  
  return supabase
    .channel('offers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, callback)
    .subscribe();
};

// Subscribe to partner reservations for realtime dashboard updates
export const subscribeToPartnerReservations = (partnerId: string, callback: (payload: unknown) => void) => {
  if (isDemoMode) {
    return { unsubscribe: () => {} };
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

export const subscribeToReservations = (customerId: string, callback: (payload: unknown) => void) => {
  if (isDemoMode) {
    return { unsubscribe: () => {} };
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

// Duplicate offer function for partner dashboard
export const duplicateOffer = async (offerId: string, partnerId: string): Promise<Offer> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }
  
  // Get the original offer
  const { data: originalOffer, error: fetchError } = await supabase
    .from('offers')
    .select('*')
    .eq('id', offerId)
    .single();

  if (fetchError) throw fetchError;

  // Get partner's business hours to determine pickup window duration
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('business_hours')
    .eq('id', partnerId)
    .single();

  if (partnerError) throw partnerError;

  // Set pickup to start NOW
  const now = new Date();
  const pickupStart = new Date(now);
  
  // Calculate pickup end time based on partner's business hours
  // Default to 12 hours if 24h operation, or use actual business hours
  const businessHours = partner?.business_hours;
  let durationHours = 12; // Default for 24h businesses
  
  // If partner has business hours set, calculate duration
  if (businessHours && typeof businessHours === 'object') {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = dayNames[now.getDay()];
    const todayHours = businessHours[today];
    
    if (todayHours && todayHours.open && todayHours.close) {
      // Parse business hours (format: "HH:MM")
      const [openHour, openMin] = todayHours.open.split(':').map(Number);
      const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
      
      // Create date objects for today's open/close times
      const openTime = new Date(now);
      openTime.setHours(openHour, openMin, 0, 0);
      
      const closeTime = new Date(now);
      closeTime.setHours(closeHour, closeMin, 0, 0);
      
      // If close time is before open time, it's next day closing
      if (closeTime < openTime) {
        closeTime.setDate(closeTime.getDate() + 1);
      }
      
      // Calculate hours until closing
      durationHours = Math.max(1, Math.floor((closeTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
    }
  }
  
  const pickupEnd = new Date(pickupStart);
  pickupEnd.setHours(pickupEnd.getHours() + durationHours);

  // Create new offer with updated dates
  const { data, error } = await supabase
    .from('offers')
    .insert({
      partner_id: partnerId,
      title: originalOffer.title,
      description: originalOffer.description,
      category: originalOffer.category,
      images: originalOffer.images,
      original_price: originalOffer.original_price,
      smart_price: originalOffer.smart_price,
      quantity_available: originalOffer.quantity_total,
      quantity_total: originalOffer.quantity_total,
      pickup_start: pickupStart.toISOString(),
      pickup_end: pickupEnd.toISOString(),
      status: 'ACTIVE',
      expires_at: pickupEnd.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Offer;
};
// Resolve an offer image URL that might be a bare filename or a full URL
export const resolveOfferImageUrl = (url?: string, category?: string): string => {
  if (!url) return '';

  const trimmed = url.trim();

  // Basic sanitization: prevent directory traversal attempts
  if (trimmed.includes('..')) {
    return '';
  }

  // Absolute URLs (already public)
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Public assets served from the app (e.g. from /public/library/...)
  if (trimmed.startsWith('/')) return trimmed; // already root-relative
  if (trimmed.toLowerCase().startsWith('library/')) return `/${trimmed}`;
  if (trimmed.toLowerCase().startsWith('public/library/')) return `/${trimmed.slice('public/'.length)}`;

  // Bare filename coming from library selection (e.g., "xinkali.jpg")
  if (!trimmed.includes('/') && category) {
    return `/library/${category.toUpperCase()}/${trimmed}`;
  }

  // Otherwise treat as Supabase Storage path (e.g., partners/... or offer-images/...)
  try {
    const path = trimmed.replace(/^\/+/, '');
    const { data: { publicUrl } } = supabase.storage
      .from('offer-images')
      .getPublicUrl(path);
    return publicUrl || trimmed;
  } catch {
    return trimmed;
  }
};

// Partner Points API
export interface PartnerPoints {
  user_id: string;
  balance: number;
  offer_slots: number;
  created_at: string;
  updated_at: string;
}

export interface PartnerPointTransaction {
  id: string;
  partner_id: string;
  change: number;
  reason: string;
  balance_before: number;
  balance_after: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const getPartnerPoints = async (userId: string): Promise<PartnerPoints | null> => {
  try {
    console.log('🔍 getPartnerPoints called with userId:', userId);

    // First get partner_id from user_id
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (partnerError || !partner) {
      console.warn('⚠️ Partner not found for userId:', userId);
      return null;
    }

    // Then get partner points using user_id (column name is confusing but correct)
    const { data, error } = await supabase
      .from('partner_points')
      .select('*')
      .eq('user_id', partner.id)  // Column is named user_id, not partner_id
      .maybeSingle();

    if (error) {
      // Table might not exist - return null instead of throwing
      console.warn('⚠️ getPartnerPoints error (table might not exist):', error);
      logger.warn('Partner points table not available', { error, userId });
      return null;
    }

    console.log('✅ getPartnerPoints result:', data);
    return data;
  } catch (error) {
    // Don't throw - return null to allow dashboard to load
    console.warn('⚠️ getPartnerPoints exception:', error);
    logger.warn('Error in getPartnerPoints', { error, userId });
    return null;
  }
};

export const getPartnerPointTransactions = async (
  partnerId: string,
  limit = 50
): Promise<PartnerPointTransaction[]> => {
  try {
    const { data, error } = await supabase
      .from('partner_point_transactions')
      .select('*')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Table might not exist - return empty array
      logger.warn('Partner point transactions table not available', { error, partnerId });
      return [];
    }

    return data || [];
  } catch (error) {
    // Don't throw - return empty array
    logger.warn('Error in getPartnerPointTransactions', { error, partnerId });
    return [];
  }
};

export const purchaseOfferSlot = async (): Promise<{
  success: boolean;
  message?: string;
  new_slots?: number;
  cost?: number;
  balance?: number;
}> => {
  try {
    const { data, error } = await supabase.rpc('purchase_partner_offer_slot');

    if (error) {
      logger.error('Failed to purchase offer slot', { error });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error in purchaseOfferSlot', { error });
    throw error;
  }
};

// Points Escrow System
export const userConfirmPickup = async (reservationId: string): Promise<{
  success: boolean;
  message?: string;
  points_transferred?: number;
}> => {
  try {
    const { data, error } = await supabase.rpc('user_confirm_pickup', {
      p_reservation_id: reservationId
    });

    if (error) {
      logger.error('Failed to confirm pickup', { error, reservationId });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error in userConfirmPickup', { error, reservationId });
    throw error;
  }
};

export const partnerConfirmNoShow = async (reservationId: string): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const { data, error } = await supabase.rpc('partner_confirm_no_show', {
      p_reservation_id: reservationId
    });

    if (error) {
      logger.error('Failed to confirm no-show', { error, reservationId });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error in partnerConfirmNoShow', { error, reservationId });
    throw error;
  }
};

export const partnerForgiveCustomer = async (reservationId: string): Promise<{
  success: boolean;
  message?: string;
  penalty_removed?: boolean;
}> => {
  try {
    const { data, error } = await supabase.rpc('partner_forgive_customer', {
      p_reservation_id: reservationId
    });

    if (error) {
      logger.error('Failed to forgive customer', { error, reservationId });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error in partnerForgiveCustomer', { error, reservationId });
    throw error;
  }
};

export const userCancelReservationWithSplit = async (reservationId: string): Promise<{
  success: boolean;
  message?: string;
  partner_received?: number;
  user_refunded?: number;
  points_lost?: number;
}> => {
  try {
    const { data, error } = await supabase.rpc('user_cancel_reservation_split', {
      p_reservation_id: reservationId
    });

    if (error) {
      logger.error('Failed to cancel reservation', { error, reservationId });
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Error in userCancelReservationWithSplit', { error, reservationId });
    throw error;
  }
};
