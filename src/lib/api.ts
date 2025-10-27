import { supabase, isDemoMode } from './supabase';
import { Offer, Reservation, Partner, CreateOfferDTO, OfferFilters, User, PenaltyInfo } from './types';
import { mockOffers, mockPartners } from './mockData';
import QRCode from 'qrcode';

// Auth functions
export const getCurrentUser = async (): Promise<{ user: User | null; error?: unknown }> => {
  if (isDemoMode) {
    return { user: null };
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) return { user: null, error };
    
    if (!user) return { user: null };

    // Get user role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

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
    
    // Determine penalty duration
    let penaltyHours = 0;
    if (newCount === 1) {
      penaltyHours = 3; // First miss: 3 hours
    } else {
      penaltyHours = 12; // Second and subsequent: 12 hours
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
    let filtered = [...mockOffers];
    if (filters?.category) {
      filtered = filtered.filter(o => o.category === filters.category);
    }
    return filtered;
  }
  
  let query = supabase
    .from('offers')
    .select(`
      *,
      partner:partners(*)
    `)
    .eq('status', 'ACTIVE')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Offer[];
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
  
  // Upload images first
  const imageUrls = await uploadImages(offerData.images, 'offer-images');

  const { data, error } = await supabase
    .from('offers')
    .insert({
      partner_id: partnerId,
      title: offerData.title,
      description: offerData.description,
      category: offerData.category,
      images: imageUrls,
      original_price: offerData.original_price,
      smart_price: offerData.smart_price,
      quantity_available: offerData.quantity_total,
      quantity_total: offerData.quantity_total,
      pickup_start: offerData.pickup_window.start.toISOString(),
      pickup_end: offerData.pickup_window.end.toISOString(),
      status: 'ACTIVE',
      expires_at: offerData.pickup_window.end.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
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
  
  // Check penalty status
  const penaltyInfo = await checkUserPenalty(customerId);
  if (penaltyInfo.isUnderPenalty) {
    throw new Error(`You are currently under penalty until ${penaltyInfo.penaltyUntil?.toLocaleString()}. Remaining time: ${penaltyInfo.remainingTime}`);
  }

  // Enforce 3-unit maximum per offer per user
  if (quantity > 3) {
    throw new Error('Maximum 3 units allowed per reservation');
  }

  // Generate unique QR code
  const timestamp = Date.now();
  const qrCode = `SP-${timestamp.toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  // Get offer to calculate price
  const offer = await getOfferById(offerId);
  const totalPrice = offer.smart_price * quantity;

  const { data, error } = await supabase
    .from('reservations')
    .insert({
      offer_id: offerId,
      customer_id: customerId,
      partner_id: offer.partner_id,
      qr_code: qrCode,
      quantity,
      total_price: totalPrice,
      status: 'ACTIVE',
      expires_at: expiresAt.toISOString(),
    })
    .select(`
      *,
      offer:offers(*),
      partner:partners(*)
    `)
    .single();

  if (error) throw error;

  // Update offer quantity
  await supabase
    .from('offers')
    .update({ quantity_available: offer.quantity_available - quantity })
    .eq('id', offerId);

  return data as Reservation;
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
      customer:users(name, email, phone)
    `)
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Reservation[];
};

export const validateQRCode = async (qrCode: string): Promise<{ valid: boolean; reservation?: Reservation; error?: string }> => {
  if (isDemoMode) {
    return { valid: false, error: 'Demo mode: Please configure Supabase' };
  }
  
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      offer:offers(*),
      customer:users(name, email, phone)
    `)
    .eq('qr_code', qrCode)
    .eq('status', 'ACTIVE')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid or expired QR code' };
  }

  return { valid: true, reservation: data as Reservation };
};

export const markAsPickedUp = async (reservationId: string): Promise<Reservation> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }

  // Get reservation details first
  const { data: reservation, error: reservationError } = await supabase
    .from('reservations')
    .select('offer_id, quantity, customer_id')
    .eq('id', reservationId)
    .single();

  if (reservationError) throw reservationError;

  // Clear penalty on successful pickup
  await clearPenalty(reservation.customer_id);

  // ✅ Only update reservation status — do NOT touch offer quantity again
  const { data, error } = await supabase
    .from('reservations')
    .update({
      status: 'PICKED_UP',
      picked_up_at: new Date().toISOString(),
    })
    .eq('id', reservationId)
    .select()
    .single();

  if (error) throw error;

  return data as Reservation;
};


export const cancelReservation = async (reservationId: string): Promise<void> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }
  
  // Get reservation to restore quantity
  const { data: reservation } = await supabase
    .from('reservations')
    .select('offer_id, quantity')
    .eq('id', reservationId)
    .single();

  if (reservation) {
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
  }

  // Cancel reservation
  const { error } = await supabase
    .from('reservations')
    .update({ status: 'CANCELLED' })
    .eq('id', reservationId);

  if (error) throw error;
};

// Partners API
export const getPartnerByUserId = async (userId: string): Promise<Partner | null> => {
  if (isDemoMode) {
    return null;
  }
  
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) return null;
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

export const getPartnerStats = async (partnerId: string) => {
  if (isDemoMode) {
    return {
      activeOffers: 0,
      reservationsToday: 0,
      itemsPickedUp: 0,
    };
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
export const uploadImages = async (files: File[], bucket: string): Promise<string[]> => {
  if (isDemoMode) {
    return [];
  }
  
  const urls: string[] = [];

  for (const file of files) {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    urls.push(publicUrl);
  }

  return urls;
};

export const generateQRCodeDataURL = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
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

  // Set pickup time to next day
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const pickupStart = new Date(originalOffer.pickup_start);
  const pickupEnd = new Date(originalOffer.pickup_end);
  
  pickupStart.setDate(tomorrow.getDate());
  pickupEnd.setDate(tomorrow.getDate());

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