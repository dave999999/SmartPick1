/**
 * Advanced Analytics API
 * DAU/MAU, retention cohorts, conversion funnels, and predictive metrics
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface AnalyticsMetrics {
  // User Engagement
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
  dau_mau_ratio: number; // Stickiness ratio (should be > 20%)
  avg_session_duration_minutes: number;
  avg_sessions_per_user: number;

  // Growth
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
  user_growth_rate_percent: number; // Month-over-month

  // Retention
  day_1_retention: number; // % of users who return next day
  day_7_retention: number;
  day_30_retention: number;

  // Revenue
  arpu: number; // Average Revenue Per User
  arppu: number; // Average Revenue Per Paying User
  paying_user_rate: number; // % of users who have purchased
  ltv: number; // Lifetime Value estimate

  // Partner Metrics
  active_partners: number;
  avg_offers_per_partner: number;
  partner_churn_rate: number;
}

export interface CohortData {
  cohort_month: string; // "2024-01"
  cohort_size: number;
  retention_rates: number[]; // [100, 80, 65, 55, 50, ...] for months 0-11
}

export interface ConversionFunnel {
  stage: string;
  users: number;
  conversion_rate: number;
  drop_off_rate: number;
}

export interface UserSegment {
  segment_name: string;
  user_count: number;
  avg_points: number;
  avg_reservations: number;
  avg_ltv: number;
}

export interface RevenueBreakdown {
  date: string;
  total_revenue: number;
  point_purchases: number;
  reservation_fees: number;
  avg_transaction_value: number;
  transaction_count: number;
}

/**
 * Get comprehensive analytics metrics
 */
export async function getAnalyticsMetrics(): Promise<AnalyticsMetrics> {
  const { data, error } = await supabase.rpc('admin_get_analytics_metrics');
  if (error || !data) return getEmptyMetrics();
  return data;
}

function getEmptyMetrics(): AnalyticsMetrics {
  return {
    dau: 0,
    wau: 0,
    mau: 0,
    dau_mau_ratio: 0,
    avg_session_duration_minutes: 0,
    avg_sessions_per_user: 0,
    new_users_today: 0,
    new_users_this_week: 0,
    new_users_this_month: 0,
    user_growth_rate_percent: 0,
    day_1_retention: 0,
    day_7_retention: 0,
    day_30_retention: 0,
    arpu: 0,
    arppu: 0,
    paying_user_rate: 0,
    ltv: 0,
    active_partners: 0,
    avg_offers_per_partner: 0,
    partner_churn_rate: 0,
  };
}

/**
 * Get retention cohort analysis
 */
export async function getRetentionCohorts(months = 12): Promise<CohortData[]> {
  const { data, error } = await supabase.rpc('admin_get_retention_cohorts', { p_months: months });
  if (error || !data) return [];
  return data;
}

/**
 * Get conversion funnel data
 */
export async function getConversionFunnel(funnelType: 'signup' | 'purchase' | 'reservation'): Promise<ConversionFunnel[]> {
  const { data, error } = await supabase.rpc('admin_get_conversion_funnel', { p_funnel_type: funnelType });
  if (error || !data) return [];
  return data;
}

/**
 * Get user segments
 */
export async function getUserSegments(): Promise<UserSegment[]> {
  const { data, error } = await supabase.rpc('admin_get_user_segments');
  if (error || !data) return [];
  return data;
}

/**
 * Get revenue breakdown over time
 */
export async function getRevenueBreakdown(days = 30): Promise<RevenueBreakdown[]> {
  const { data, error } = await supabase.rpc('admin_get_revenue_breakdown', { p_days: days });
  if (error || !data) return [];
  return data;
}

/**
 * Get top performing offers
 */
export async function getTopOffers(limit = 20): Promise<{
  offer_id: string;
  title: string;
  partner_name: string;
  total_reservations: number;
  total_revenue: number;
  avg_rating: number;
  conversion_rate: number;
}[]> {
  const { data, error } = await supabase.rpc('admin_get_top_offers', { p_limit: limit });
  if (error || !data) return [];
  return data;
}

/**
 * Get user activity heatmap (hour of day vs day of week)
 */
export async function getUserActivityHeatmap(): Promise<{
  hour: number;
  day_of_week: number;
  activity_count: number;
}[]> {
  const { data, error } = await supabase.rpc('admin_get_activity_heatmap');
  if (error || !data) return [];
  return data;
}

/**
 * Get churn prediction
 */
export async function getChurnPrediction(): Promise<{
  user_id: string;
  full_name: string;
  churn_risk: 'HIGH' | 'MEDIUM' | 'LOW';
  churn_score: number;
  days_since_last_activity: number;
  total_points: number;
  total_reservations: number;
}[]> {
  const { data, error } = await supabase.rpc('admin_get_churn_prediction');
  if (error || !data) return [];
  return data;
}

/**
 * Get partner performance metrics
 */
export async function getPartnerPerformance(): Promise<{
  partner_id: string;
  business_name: string;
  total_offers: number;
  active_offers: number;
  total_reservations: number;
  avg_rating: number;
  response_time_minutes: number;
  completion_rate: number;
  revenue_generated: number;
}[]> {
  const { data, error } = await supabase.rpc('admin_get_partner_performance');
  if (error || !data) return [];
  return data;
}

/**
 * Get geographic analytics
 */
export async function getGeographicAnalytics(): Promise<{
  city: string;
  user_count: number;
  partner_count: number;
  reservation_count: number;
  revenue: number;
  avg_basket_size: number;
}[]> {
  const { data, error } = await supabase.rpc('admin_get_geographic_analytics');
  if (error || !data) return [];
  return data;
}

/**
 * Get predictive revenue forecast (next 30 days)
 */
export async function getRevenueForecast(): Promise<{
  date: string;
  predicted_revenue: number;
  confidence_lower: number;
  confidence_upper: number;
}[]> {
  const { data, error } = await supabase.rpc('admin_get_revenue_forecast');
  if (error || !data) return [];
  return data;
}

/**
 * Export analytics data to CSV
 */
export async function exportAnalyticsCSV(reportType: 'users' | 'partners' | 'revenue' | 'reservations'): Promise<Blob> {
  try {
    let data: any[] = [];

    switch (reportType) {
      case 'users':
        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, email, role, smart_points, level, created_at')
          .order('created_at', { ascending: false });
        data = userData || [];
        break;

      case 'partners':
        const { data: partnerData } = await supabase
          .from('partners')
          .select('id, business_name, contact_email, status, total_reservations, rating, created_at')
          .order('created_at', { ascending: false });
        data = partnerData || [];
        break;

      case 'revenue':
        const revenueData = await getRevenueBreakdown(90);
        data = revenueData;
        break;

      case 'reservations':
        const { data: reservationData } = await supabase
          .from('reservations')
          .select('id, user_id, offer_id, status, smart_points, created_at, picked_up_at')
          .order('created_at', { ascending: false })
          .limit(10000);
        data = reservationData || [];
        break;
    }

    // Convert to CSV
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    return new Blob([csvContent], { type: 'text/csv' });
  } catch (error) {
    logger.error('[Admin] Failed to export analytics CSV', error);
    throw error;
  }
}
