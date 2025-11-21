// Modularized API exports
export { getPartnerAnalytics, getPartnerPayoutInfo } from './api/partner-analytics';
export { checkUserPenalty, applyPenalty, clearPenalty } from './api/penalties';
export { 
  getUserMaxSlots, 
  getUserSlotInfo, 
  purchaseReservationSlot, 
  canAffordNextSlot,
  getUpgradeableSlotsPreview,
  type UserSlotInfo,
  type SlotPurchaseHistory
} from './api/reservation-slots';
export { 
  getCurrentUser, 
  signInWithEmail, 
  signUpWithEmail, 
  signInWithGoogle, 
  signOut, 
  updateUserProfile,
  updatePassword 
} from './api/auth';
export {
  getActiveOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  relistOffer,
  duplicateOffer
} from './api/offers';
export {
  uploadImages,
  resolveOfferImageUrl
} from './api/media';
export {
  createReservation,
  getReservationById,
  getCustomerReservations,
  getPartnerReservations,
  validateQRCode,
  markAsPickedUp,
  cancelReservation,
  cleanupOldHistory,
  clearAllHistory,
  type QRValidationResult
} from './api/reservations';
export {
  getPartnerByUserId,
  getPartnerById,
  createPartnerApplication,
  getPartnerOffers,
  getPartnerStats,
  getPendingPartners,
  approvePartner,
  rejectPartner,
  partnerConfirmNoShow,
  partnerForgiveCustomer
} from './api/partners';
export {
  subscribeToPartnerOffers,
  subscribeToPartnerReservations,
  subscribeToReservations
} from './api/realtime';
export { generateQRCodeDataURL } from './api/qr-codes';

import { supabase, isDemoMode } from './supabase';
import { logger } from './logger';

// Auth functions moved to ./api/auth.ts
// Penalty System Functions moved to ./api/penalties.ts
// Offers API moved to ./api/offers.ts
// Media functions moved to ./api/media.ts
// Reservations API moved to ./api/reservations.ts
// Partners API moved to ./api/partners.ts

// Platform Stats
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

// Media functions (upload, validation) moved to ./api/media.ts
// QR Code, realtime subscriptions, and duplicateOffer moved to separate modules

// Real-time subscriptions moved to ./api/realtime.ts
// QR code generation moved to ./api/qr-codes.ts

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

// partnerConfirmNoShow moved to ./api/partners.ts
// partnerForgiveCustomer moved to ./api/partners.ts

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
