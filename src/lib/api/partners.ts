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

// Direct fetch by partner ID for admin impersonation/inspection use cases
export const getPartnerById = async (partnerId: string): Promise<Partner | null> => {
  if (isDemoMode) return null;
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .maybeSingle();
  if (error) {
    console.error('Error fetching partner by id:', error);
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
    .eq('status', 'ACTIVE')
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
    // CSRF Protection
    const { getCSRFToken } = await import('@/lib/csrf');
    const csrfToken = await getCSRFToken();
    if (!csrfToken) {
      throw new Error('Security token required. Please refresh the page and try again.');
    }
    
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
    // CSRF Protection
    const { getCSRFToken } = await import('@/lib/csrf');
    const csrfToken = await getCSRFToken();
    if (!csrfToken) {
      throw new Error('Security token required. Please refresh the page and try again.');
    }
    
    const { data, error} = await supabase.rpc('partner_forgive_customer', {
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

/**
 * Approve a customer's forgiveness request
 */
export const approveForgivenessRequest = async (reservationId: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    // First, call the forgiveness function to remove penalty
    const forgivenessResult = await partnerForgiveCustomer(reservationId);

    // Then update the reservation to mark forgiveness as approved
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        forgiveness_approved: true,
        forgiveness_denied: false,
        forgiveness_handled_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    if (updateError) {
      logger.error('Failed to update forgiveness status', { error: updateError, reservationId });
      throw updateError;
    }

    return {
      success: true,
      message: 'Forgiveness approved! Customer penalty has been removed.',
    };
  } catch (error) {
    logger.error('Error approving forgiveness', { error, reservationId });
    return {
      success: false,
      message: 'Failed to approve forgiveness request',
    };
  }
};

/**
 * Deny a customer's forgiveness request
 */
export const denyForgivenessRequest = async (reservationId: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({
        forgiveness_approved: false,
        forgiveness_denied: true,
        forgiveness_handled_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    if (error) {
      logger.error('Failed to deny forgiveness', { error, reservationId });
      throw error;
    }

    return {
      success: true,
      message: 'Forgiveness request denied',
    };
  } catch (error) {
    logger.error('Error denying forgiveness', { error, reservationId });
    return {
      success: false,
      message: 'Failed to process denial',
    };
  }
};

/**
 * 🚀 PHASE 2 OPTIMIZATION: Unified Partner Dashboard Data
 * Replaces 5 separate queries with 1 RPC call
 * Saves 80% of partner dashboard queries
 */
export interface PartnerDashboardData {
  partner: Partner;
  offers: Offer[];
  activeReservations: any[];
  stats: {
    activeOffers: number;
    totalOffers: number;
    reservationsToday: number;
    itemsPickedUp: number;
    totalRevenue: number;
  };
  points: any;
}

export const getPartnerDashboardData = async (userId: string): Promise<PartnerDashboardData> => {
  if (isDemoMode) {
    throw new Error('Demo mode: Dashboard data not available');
  }

  try {
    const { data, error } = await supabase.rpc('get_partner_dashboard_data', {
      p_user_id: userId
    });

    if (error) {
      logger.error('Failed to fetch partner dashboard data:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No dashboard data returned');
    }

    logger.info('✅ Partner dashboard data loaded in single query');

    return {
      partner: data.partner,
      offers: data.offers,
      activeReservations: data.activeReservations,
      stats: data.stats,
      points: data.points
    };
  } catch (error) {
    logger.error('Error in getPartnerDashboardData:', error);
    throw error;
  }
};

/**
 * Get partner analytics data for dashboard insights
 * Returns 7-day trends, top offers, and customer insights
 */
export const getPartnerAnalytics = async (partnerId: string) => {
  if (isDemoMode) {
    // Return demo data for testing
    return {
      today: { revenue: 125.50, orders: 8, items_sold: 12 },
      yesterday: { revenue: 98.00, orders: 6 },
      weekTrend: [
        { date: '2025-12-16', revenue: 85, orders: 5 },
        { date: '2025-12-17', revenue: 110, orders: 7 },
        { date: '2025-12-18', revenue: 95, orders: 6 },
        { date: '2025-12-19', revenue: 120, orders: 8 },
        { date: '2025-12-20', revenue: 105, orders: 7 },
        { date: '2025-12-21', revenue: 98, orders: 6 },
        { date: '2025-12-22', revenue: 125.50, orders: 8 },
      ],
      topOffers: [
        { name: 'ხაჭაპური', orders: 15, revenue: 90, image_url: null },
        { name: 'პიცა', orders: 12, revenue: 72, image_url: null },
        { name: 'ლობიანი', orders: 8, revenue: 40, image_url: null },
      ],
      insights: {
        peak_hour: '18:00 - 19:00',
        avg_order_value: 15.69,
        repeat_customers: 12,
        total_customers: 25,
      },
    };
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Today's stats
    const { data: todayReservations } = await supabase
      .from('reservations')
      .select('total_price, quantity')
      .eq('partner_id', partnerId)
      .eq('status', 'PICKED_UP')
      .gte('picked_up_at', today.toISOString());

    const todayRevenue = todayReservations?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
    const todayOrders = todayReservations?.length || 0;
    const todayItems = todayReservations?.reduce((sum, r) => sum + (r.quantity || 0), 0) || 0;

    // Yesterday's stats for comparison
    const { data: yesterdayReservations } = await supabase
      .from('reservations')
      .select('total_price')
      .eq('partner_id', partnerId)
      .eq('status', 'PICKED_UP')
      .gte('picked_up_at', yesterday.toISOString())
      .lt('picked_up_at', today.toISOString());

    const yesterdayRevenue = yesterdayReservations?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
    const yesterdayOrders = yesterdayReservations?.length || 0;

    // 7-day trend
    const { data: weekReservations } = await supabase
      .from('reservations')
      .select('picked_up_at, total_price')
      .eq('partner_id', partnerId)
      .eq('status', 'PICKED_UP')
      .gte('picked_up_at', weekAgo.toISOString())
      .order('picked_up_at', { ascending: true });

    // Group by date
    const weekTrend: Array<{ date: string; revenue: number; orders: number }> = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayReservations = weekReservations?.filter(r => 
        r.picked_up_at?.startsWith(dateStr)
      ) || [];
      
      weekTrend.push({
        date: dateStr,
        revenue: dayReservations.reduce((sum, r) => sum + (r.total_price || 0), 0),
        orders: dayReservations.length,
      });
    }

    // Top performing offers (last 7 days)
    // First get reservation data with offer_ids
    const { data: topOffersData, error: topOffersError } = await supabase
      .from('reservations')
      .select('offer_id, total_price')
      .eq('partner_id', partnerId)
      .eq('status', 'PICKED_UP')
      .gte('picked_up_at', weekAgo.toISOString());

    if (topOffersError) {
      logger.error('Error fetching top offers data:', topOffersError);
    }

    // Group by offer first
    const offerMap = new Map<string, { name: string; orders: number; revenue: number; image_url?: string }>();
    topOffersData?.forEach(r => {
      const offerId = r.offer_id;
      if (!offerId) return; // Skip if no offer_id
      
      if (offerMap.has(offerId)) {
        const existing = offerMap.get(offerId)!;
        existing.orders += 1;
        existing.revenue += r.total_price || 0;
      } else {
        offerMap.set(offerId, {
          name: 'Loading...', // Will be fetched below
          orders: 1,
          revenue: r.total_price || 0,
          image_url: undefined,
        });
      }
    });

    // Now fetch offer details for the top offer IDs
    const offerIds = Array.from(offerMap.keys()).filter(id => id); // Remove any null/undefined
    let topOffers: Array<{ name: string; orders: number; revenue: number; image_url?: string }> = [];
    
    if (offerIds.length > 0) {
      try {
        logger.log('📊 Fetching details for', offerIds.length, 'offers:', offerIds);
        
        // Use different query method based on number of IDs
        let offersQuery = supabase
          .from('offers')
          .select('id, title, images');
        
        if (offerIds.length === 1) {
          // Single ID - use eq instead of in
          offersQuery = offersQuery.eq('id', offerIds[0]);
        } else {
          // Multiple IDs - use in
          offersQuery = offersQuery.in('id', offerIds);
        }
        
        const { data: offersData, error: offersError } = await offersQuery;

        if (offersError) {
          logger.error('Error fetching offers details:', offersError);
          // Use the map without names if fetch fails
          topOffers = Array.from(offerMap.values())
            .map(offer => ({
              ...offer,
              name: offer.name === 'Loading...' ? 'უცნობი პროდუქტი' : offer.name
            }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);
        } else {
          logger.log('✅ Fetched', offersData?.length, 'offer details');
          
          // Update the names and images
          offersData?.forEach(offer => {
            const existing = offerMap.get(offer.id);
            if (existing) {
              existing.name = offer.title || 'უცნობი პროდუქტი';
              existing.image_url = offer.images?.[0]; // Use first image from array
            }
          });

          topOffers = Array.from(offerMap.values())
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);
        }
      } catch (error) {
        logger.error('Exception fetching offers:', error);
        topOffers = []; // Return empty array on error
      }
    }

    // Customer insights
    const { data: customerData } = await supabase
      .from('reservations')
      .select('user_id, picked_up_at')
      .eq('partner_id', partnerId)
      .eq('status', 'PICKED_UP')
      .gte('picked_up_at', weekAgo.toISOString());

    const uniqueCustomers = new Set(customerData?.map(r => r.user_id) || []);
    const customerCounts = new Map<string, number>();
    customerData?.forEach(r => {
      const count = customerCounts.get(r.user_id) || 0;
      customerCounts.set(r.user_id, count + 1);
    });
    const repeatCustomers = Array.from(customerCounts.values()).filter(count => count > 1).length;

    // Peak hour analysis
    const hourCounts = new Array(24).fill(0);
    customerData?.forEach(r => {
      if (r.picked_up_at) {
        const hour = new Date(r.picked_up_at).getHours();
        hourCounts[hour]++;
      }
    });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakHourStr = `${peakHour}:00 - ${peakHour + 1}:00`;

    const avgOrderValue = todayOrders > 0 ? todayRevenue / todayOrders : 0;

    return {
      today: {
        revenue: todayRevenue,
        orders: todayOrders,
        items_sold: todayItems,
      },
      yesterday: {
        revenue: yesterdayRevenue,
        orders: yesterdayOrders,
      },
      weekTrend,
      topOffers,
      insights: {
        peak_hour: peakHourStr,
        avg_order_value: avgOrderValue,
        repeat_customers: repeatCustomers,
        total_customers: uniqueCustomers.size,
      },
    };
  } catch (error) {
    logger.error('Error fetching partner analytics:', error);
    throw error;
  }
};

/**
 * Get partner notification settings
 */
export const getPartnerNotificationSettings = async (partnerId: string) => {
  if (isDemoMode) {
    return {
      newOrder: true,
      lowStock: true,
      cancellation: true,
      activeExpiring: false,
      dailySummary: true,
      weeklyReport: false,
      newReview: true,
      pointsChange: false,
      newBonus: true,
    };
  }

  try {
    const { data, error } = await supabase
      .from('partners')
      .select('notification_preferences')
      .eq('id', partnerId)
      .single();

    if (error) throw error;

    return data?.notification_preferences || {
      newOrder: true,
      lowStock: true,
      cancellation: true,
      activeExpiring: false,
      dailySummary: true,
      weeklyReport: false,
      newReview: true,
      pointsChange: false,
      newBonus: true,
    };
  } catch (error) {
    logger.error('Error fetching notification settings:', error);
    throw error;
  }
};

/**
 * Update partner notification settings
 */
export const updatePartnerNotificationSettings = async (
  partnerId: string, 
  preferences: any
) => {
  if (isDemoMode) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('partners')
      .update({ notification_preferences: preferences })
      .eq('id', partnerId);

    if (error) throw error;

    logger.log('✅ Notification settings updated');
    return { success: true };
  } catch (error) {
    logger.error('Error updating notification settings:', error);
    throw error;
  }
};

/**
 * Toggle busy mode - pauses/resumes all active offers
 */
export const togglePartnerBusyMode = async (partnerId: string, enabled: boolean) => {
  if (isDemoMode) {
    return { success: true, offersAffected: 3 };
  }

  try {
    // Update partner busy_mode flag
    const { error: partnerError } = await supabase
      .from('partners')
      .update({ busy_mode: enabled })
      .eq('id', partnerId);

    if (partnerError) throw partnerError;

    // Pause or resume all active offers
    const newStatus = enabled ? 'PAUSED' : 'ACTIVE';
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .update({ status: newStatus })
      .eq('partner_id', partnerId)
      .eq('status', enabled ? 'ACTIVE' : 'PAUSED')
      .select('id');

    if (offersError) throw offersError;

    logger.log(`✅ Busy mode ${enabled ? 'enabled' : 'disabled'}, affected ${offers?.length || 0} offers`);
    
    return { 
      success: true, 
      offersAffected: offers?.length || 0 
    };
  } catch (error) {
    logger.error('Error toggling busy mode:', error);
    throw error;
  }
};
