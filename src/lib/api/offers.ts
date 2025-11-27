import { supabase, isDemoMode } from '../supabase';
import { Offer, CreateOfferDTO, OfferFilters } from '../types';
import { mockOffers } from '../mockData';
import { uploadImages } from './media';
import { secureRequest } from '../secureRequest';

/**
 * Offers Module
 * Handles offer CRUD operations, filtering, and lifecycle management
 */

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
  let query = supabase
    .from('offers')
    .select('*')
    .eq('status', 'ACTIVE')                               // only active offers
    .gt('expires_at', new Date().toISOString())            // not expired
    .gt('quantity_available', 0)                           // 🧠 hide sold-out offers
    .order('created_at', { ascending: false });             // newest first

  // 🔹 Apply category filter if provided
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  const { data: offers, error } = await query;

  if (error) {
    console.error('Error fetching active offers:', error);
    throw error;
  }

  if (!offers || offers.length === 0) {
    return [];
  }

  // Fetch partners separately to avoid RLS issues with joins
  const partnerIds = [...new Set(offers.map(o => o.partner_id).filter(Boolean))];
  
  if (partnerIds.length > 0) {
    const { data: partners } = await supabase
      .from('partners')
      .select('*')
      .in('id', partnerIds);

    if (partners) {
      // Attach partner data to offers
      const partnerMap = new Map(partners.map(p => [p.id, p]));
      offers.forEach(offer => {
        if (offer.partner_id) {
          offer.partner = partnerMap.get(offer.partner_id);
        }
      });
    }
  }

  return offers as Offer[];
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

  const maxSlots = partnerPoints?.offer_slots || 10;
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

  return await secureRequest<Offer>({
    operation: 'createOffer',
    execute: async () => {
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
    }
  });
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

export const relistOffer = async (offerId: string, partnerId: string) => {
  if (isDemoMode) {
    throw new Error('Demo mode: Please configure Supabase');
  }

  try {
    // Get the original offer with partner data for validation
    const { data: offer, error: getError } = await supabase
      .from('offers')
      .select('*, partner:partners!inner(*)')
      .eq('id', offerId)
      .single();
    
    if (getError) throw getError;
    if (!offer) throw new Error('Offer not found');

    // Verify ownership: ensure current partner owns this offer
    if (offer.partner_id !== partnerId) {
      throw new Error('You do not own this offer');
    }

    // Check slot availability (same as createOffer)
    const { data: activeOffers } = await supabase
      .from('offers')
      .select('id')
      .eq('partner_id', partnerId)
      .eq('status', 'ACTIVE');

    const { data: partnerPoints } = await supabase
      .from('partner_points')
      .select('offer_slots')
      .eq('user_id', partnerId)
      .maybeSingle();

    const maxSlots = partnerPoints?.offer_slots || 10;
    const activeCount = activeOffers?.length || 0;

    if (activeCount >= maxSlots) {
      throw new Error(`You've reached your maximum of ${maxSlots} active offers. Purchase more slots or deactivate an existing offer.`);
    }

    // Recalculate pickup window instead of copying stale times
    const now = new Date();
    const pickupStart = new Date(now);
    
    // Default to 12 hours for 24h businesses, or calculate from business hours
    let durationHours = 12;
    const partner = offer.partner;
    if (partner?.business_hours && typeof partner.business_hours === 'object') {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const today = dayNames[now.getDay()];
      const todayHours = partner.business_hours[today];
      
      if (todayHours && todayHours.open && todayHours.close) {
        const [openHour, openMin] = todayHours.open.split(':').map(Number);
        const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
        
        const openTime = new Date(now);
        openTime.setHours(openHour, openMin, 0, 0);
        
        const closeTime = new Date(now);
        closeTime.setHours(closeHour, closeMin, 0, 0);
        
        if (closeTime < openTime) {
          closeTime.setDate(closeTime.getDate() + 1);
        }
        
        durationHours = Math.max(1, Math.floor((closeTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
      }
    }
    
    const pickupEnd = new Date(pickupStart);
    pickupEnd.setHours(pickupEnd.getHours() + durationHours);

    // Explicitly reconstruct safe fields only (no spread)
    const { data: newOffer, error: createError } = await supabase
      .from('offers')
      .insert({
        partner_id: partnerId,
        title: offer.title,
        description: offer.description,
        category: offer.category,
        images: offer.images || [],
        original_price: offer.original_price,
        smart_price: offer.smart_price,
        quantity_available: offer.quantity_total,
        quantity_total: offer.quantity_total,
        pickup_start: pickupStart.toISOString(),
        pickup_end: pickupEnd.toISOString(),
        status: 'ACTIVE',
        expires_at: pickupEnd.toISOString(),
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
  if (!originalOffer) throw new Error('Offer not found');

  // Verify ownership
  if (originalOffer.partner_id !== partnerId) {
    throw new Error('You do not own this offer');
  }

  // Check slot availability (same as createOffer and relistOffer)
  const { data: activeOffers } = await supabase
    .from('offers')
    .select('id')
    .eq('partner_id', partnerId)
    .eq('status', 'ACTIVE');

  const { data: partnerPoints } = await supabase
    .from('partner_points')
    .select('offer_slots')
    .eq('user_id', partnerId)
    .maybeSingle();

  const maxSlots = partnerPoints?.offer_slots || 10;
  const activeCount = activeOffers?.length || 0;

  if (activeCount >= maxSlots) {
    throw new Error(`You've reached your maximum of ${maxSlots} active offers. Purchase more slots or deactivate an existing offer.`);
  }

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
