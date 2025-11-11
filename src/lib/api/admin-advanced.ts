/**
 * Advanced Admin API
 * Provides functions for admin dashboard features:
 * - Offer moderation
 * - Financial tracking
 * - Analytics
 * - System health
 * - Content management
 * - Audit logs
 */

import { supabase } from '../supabase';
import { checkAdminAccess } from '../admin-api';
import type {
  AuditLog,
  OfferFlag,
  Announcement,
  FAQ,
  SystemLog,
  UserActivity,
  RevenueStats,
  UserGrowthData,
  TopPartner,
  CategoryStats,
  AdminDashboardStats,
} from '../types/admin';

// =====================================================
// AUDIT LOGGING
// =====================================================

export const logAdminAction = async (
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>
): Promise<void> => {
  try {
    await supabase.rpc('log_admin_action', {
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_details: details,
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

export const getAuditLogs = async (limit: number = 100): Promise<AuditLog[]> => {
  await checkAdminAccess();

  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      admin:users!audit_logs_admin_id_fkey(name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as AuditLog[];
};

// =====================================================
// OFFER MODERATION
// =====================================================

export const getFlaggedOffers = async (): Promise<OfferFlag[]> => {
  await checkAdminAccess();

  const { data, error } = await supabase
    .from('offer_flags')
    .select(`
      *,
      offer:offers(title, partner:partners(business_name)),
      reporter:users!offer_flags_reported_by_fkey(name, email)
    `)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as OfferFlag[];
};

export const reviewOfferFlag = async (
  flagId: string,
  status: 'REVIEWED' | 'RESOLVED' | 'DISMISSED',
  adminNotes?: string
): Promise<void> => {
  await checkAdminAccess();

  const { error } = await supabase
    .from('offer_flags')
    .update({
      status,
      reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      reviewed_at: new Date().toISOString(),
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', flagId);

  if (error) throw error;

  await logAdminAction('OFFER_FLAG_REVIEWED', 'OFFER_FLAG', flagId, {
    status,
    notes: adminNotes,
  });
};

export const flagOffer = async (
  offerId: string,
  reason: string,
  adminNotes?: string
): Promise<void> => {
  await checkAdminAccess();

  const { error } = await supabase
    .from('offers')
    .update({
      is_flagged: true,
      flagged_reason: reason,
      admin_notes: adminNotes,
    })
    .eq('id', offerId);

  if (error) throw error;

  await logAdminAction('OFFER_FLAGGED', 'OFFER', offerId, { reason });
};

export const unflagOffer = async (offerId: string): Promise<void> => {
  await checkAdminAccess();

  const { error } = await supabase
    .from('offers')
    .update({
      is_flagged: false,
      flagged_reason: null,
    })
    .eq('id', offerId);

  if (error) throw error;

  await logAdminAction('OFFER_UNFLAGGED', 'OFFER', offerId);
};

export const featureOffer = async (
  offerId: string,
  featuredUntil?: string
): Promise<void> => {
  await checkAdminAccess();

  const { error } = await supabase
    .from('offers')
    .update({
      is_featured: true,
      featured_until: featuredUntil,
    })
    .eq('id', offerId);

  if (error) throw error;

  await logAdminAction('OFFER_FEATURED', 'OFFER', offerId, { featuredUntil });
};

export const unfeatureOffer = async (offerId: string): Promise<void> => {
  await checkAdminAccess();

  const { error } = await supabase
    .from('offers')
    .update({
      is_featured: false,
      featured_until: null,
    })
    .eq('id', offerId);

  if (error) throw error;

  await logAdminAction('OFFER_UNFEATURED', 'OFFER', offerId);
};

// =====================================================
// FINANCIAL DASHBOARD
// =====================================================

// Unified Stats RPC (non-breaking addition). Falls back to existing counts if needed in consumers.
export const getAdminDashboardStatsRpc = async () => {
  await checkAdminAccess();
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error) throw error;
  // rpc returns a single row (array with one item in some clients)
  const row = Array.isArray(data) ? data[0] : data;
  return {
    total_users: row?.total_users ?? 0,
    total_partners: row?.total_partners ?? 0,
    active_offers: row?.active_offers ?? 0,
    reservations_today: row?.reservations_today ?? 0,
    revenue_today: row?.revenue_today ?? 0,
  };
};

export const getPlatformRevenueStats = async (
  startDate: string,
  endDate: string
): Promise<RevenueStats> => {
  await checkAdminAccess();

  const { data, error } = await supabase.rpc('get_platform_revenue_stats', {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) throw error;
  return (data && data[0]) || {
    total_revenue: 0,
    total_reservations: 0,
    total_pickups: 0,
    average_order_value: 0,
    completion_rate: 0,
  };
};

// REMOVED: Partner payout functions
// Platform doesn't handle partner payouts - users pay partners directly
// Platform revenue comes only from point purchases

export const updatePayoutStatus = async (
  payoutId: string,
  status: 'PROCESSING' | 'PAID' | 'CANCELLED',
  paymentReference?: string,
  notes?: string
): Promise<void> => {
  await checkAdminAccess();

  const { error } = await supabase
    .from('partner_payouts')
    .update({
      status,
      payment_reference: paymentReference,
      notes,
      processed_by: (await supabase.auth.getUser()).data.user?.id,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payoutId);

  if (error) throw error;

  await logAdminAction('PAYOUT_STATUS_UPDATED', 'PAYOUT', payoutId, {
    status,
    reference: paymentReference,
  });
};

export const exportFinancialReport = async (
  startDate: string,
  endDate: string
): Promise<string> => {
  await checkAdminAccess();

  // Get all reservations in the period
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select(`
      *,
      offer:offers(title, smart_price),
      partner:partners(business_name),
      customer:users(name, email)
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Generate CSV
  const headers = [
    'Date',
    'Customer',
    'Partner',
    'Offer',
    'Quantity',
    'Total Price',
    'Status',
  ];

  const rows = (reservations || []).map((r: any) => [
    new Date(r.created_at).toLocaleDateString(),
    r.customer?.name || 'N/A',
    r.partner?.business_name || 'N/A',
    r.offer?.title || 'N/A',
    r.quantity,
    r.total_price,
    r.status,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  await logAdminAction('FINANCIAL_REPORT_EXPORTED', 'REPORT', undefined, {
    startDate,
    endDate,
    recordCount: rows.length,
  });

  return csv;
};

// =====================================================
// ANALYTICS & INSIGHTS
// =====================================================

export const getUserGrowthStats = async (): Promise<UserGrowthData[]> => {
  await checkAdminAccess();

  const { data, error } = await supabase.rpc('get_user_growth_stats');

  if (error) throw error;
  return (data || []) as UserGrowthData[];
};

export const getTopPartners = async (limit: number = 10): Promise<TopPartner[]> => {
  await checkAdminAccess();

  const { data, error } = await supabase.rpc('get_top_partners', {
    p_limit: limit,
  });

  if (error) throw error;
  return (data || []) as TopPartner[];
};

export const getCategoryStats = async (): Promise<CategoryStats[]> => {
  await checkAdminAccess();

  const { data, error } = await supabase.rpc('get_category_stats');

  if (error) throw error;
  return (data || []) as CategoryStats[];
};

export const getAdminDashboardStats = async (): Promise<AdminDashboardStats> => {
  await checkAdminAccess();

  const [
    usersResult,
    partnersResult,
    offersResult,
    reservationsResult,
    revenueResult,
    activeReservationsResult,
    pendingPartnersResult,
    flaggedOffersResult,
    bannedUsersResult,
    errorsResult,
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('partners').select('id', { count: 'exact', head: true }),
    supabase.from('offers').select('id', { count: 'exact', head: true }),
    supabase.from('reservations').select('id', { count: 'exact', head: true }),
    supabase
      .from('reservations')
      .select('total_price')
      .eq('status', 'PICKED_UP'),
    supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE'),
    supabase
      .from('partners')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING'),
    supabase
      .from('offers')
      .select('id', { count: 'exact', head: true })
      .eq('is_flagged', true),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'BANNED'),
    supabase
      .from('system_logs')
      .select('id', { count: 'exact', head: true })
      .eq('log_level', 'ERROR')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const totalRevenue = revenueResult.data?.reduce(
    (sum: number, r: any) => sum + (r.total_price || 0),
    0
  ) || 0;

  return {
    totalUsers: usersResult.count || 0,
    totalPartners: partnersResult.count || 0,
    totalOffers: offersResult.count || 0,
    totalReservations: reservationsResult.count || 0,
    totalRevenue,
    activeReservations: activeReservationsResult.count || 0,
    pendingPartnerApplications: pendingPartnersResult.count || 0,
    flaggedOffers: flaggedOffersResult.count || 0,
    bannedUsers: bannedUsersResult.count || 0,
    systemErrors: errorsResult.count || 0,
  };
};

// =====================================================
// SYSTEM HEALTH MONITORING
// =====================================================

export const getSystemLogs = async (
  level?: 'ERROR' | 'WARNING' | 'INFO',
  limit: number = 100
): Promise<SystemLog[]> => {
  await checkAdminAccess();

  let query = supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (level) {
    query = query.eq('log_level', level);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as SystemLog[];
};

export const logSystemError = async (
  component: string,
  message: string,
  errorDetails?: any
): Promise<void> => {
  try {
    await supabase.from('system_logs').insert({
      log_level: 'ERROR',
      component,
      message,
      error_details: errorDetails,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    });
  } catch (error) {
    console.error('Failed to log system error:', error);
  }
};

export const getSuspiciousActivity = async (): Promise<UserActivity[]> => {
  await checkAdminAccess();

  const { data, error } = await supabase
    .from('user_activity')
    .select(`
      *,
      user:users(name, email)
    `)
    .eq('is_suspicious', true)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data || []) as UserActivity[];
};

// =====================================================
// CONTENT MANAGEMENT
// =====================================================

export const getAnnouncements = async (
  activeOnly: boolean = false
): Promise<Announcement[]> => {
  if (activeOnly) {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .lte('display_from', new Date().toISOString())
      .or(`display_until.is.null,display_until.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Announcement[];
  }

  await checkAdminAccess();

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Announcement[];
};

export const createAnnouncement = async (
  announcement: Omit<Announcement, 'id' | 'created_by' | 'created_at' | 'updated_at'>
): Promise<Announcement> => {
  await checkAdminAccess();

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      ...announcement,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('ANNOUNCEMENT_CREATED', 'ANNOUNCEMENT', data.id);

  return data as Announcement;
};

export const updateAnnouncement = async (
  id: string,
  updates: Partial<Announcement>
): Promise<void> => {
  await checkAdminAccess();

  const { error } = await supabase
    .from('announcements')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  await logAdminAction('ANNOUNCEMENT_UPDATED', 'ANNOUNCEMENT', id);
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  await checkAdminAccess();

  const { error } = await supabase.from('announcements').delete().eq('id', id);

  if (error) throw error;

  await logAdminAction('ANNOUNCEMENT_DELETED', 'ANNOUNCEMENT', id);
};

export const getFAQs = async (publishedOnly: boolean = false): Promise<FAQ[]> => {
  if (publishedOnly) {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('is_published', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return (data || []) as FAQ[];
  }

  await checkAdminAccess();

  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data || []) as FAQ[];
};

export const createFAQ = async (
  faq: Omit<FAQ, 'id' | 'created_by' | 'created_at' | 'updated_at'>
): Promise<FAQ> => {
  await checkAdminAccess();

  const { data, error } = await supabase
    .from('faqs')
    .insert({
      ...faq,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction('FAQ_CREATED', 'FAQ', data.id);

  return data as FAQ;
};

export const updateFAQ = async (
  id: string,
  updates: Partial<FAQ>
): Promise<void> => {
  await checkAdminAccess();

  const { error } = await supabase
    .from('faqs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  await logAdminAction('FAQ_UPDATED', 'FAQ', id);
};

export const deleteFAQ = async (id: string): Promise<void> => {
  await checkAdminAccess();

  const { error } = await supabase.from('faqs').delete().eq('id', id);

  if (error) throw error;

  await logAdminAction('FAQ_DELETED', 'FAQ', id);
};
