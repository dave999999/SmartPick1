import { supabase, isDemoMode } from '../supabase';
import { Partner, Offer } from '../types';
import { logger } from '../logger';

/**
 * Partners API Module
 * Handles partner account management, applications, and partner-specific operations
 */

// Partner Account Management

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

// Admin Partner Management

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

// Partner Reservation Actions

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
