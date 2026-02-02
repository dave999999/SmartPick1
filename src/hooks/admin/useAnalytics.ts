/**
 * Analytics Hook ★ NEW
 * Comprehensive analytics queries for growth, revenue, and behavioral metrics
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
}

export interface GrowthMetrics {
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  signupTrend: { date: string; count: number }[]; // Last 30 days
}

export interface ReservationMetrics {
  totalReservations: number;
  completedReservations: number;
  cancelledReservations: number;
  expiredReservations: number;
  noShowCount: number;
  pickupRate: number; // Percentage
  avgTimeToPickup: number; // Minutes
  reservationTrend: { date: string; count: number }[]; // Last 30 days
  pickupRateByHour: { hour: number; pickupRate: number }[];
}

export interface RevenueMetrics {
  totalGMV: number;
  totalRevenue: number; // 15% commission
  avgOrderValue: number;
  gmvTrend: { date: string; gmv: number; revenue: number }[]; // Last 30 days
  revenueByPartner: { partner_id: string; business_name: string; revenue: number; gmv: number }[];
  revenueByCategory: { category: string; revenue: number; gmv: number }[];
}

export interface GeoMetrics {
  reservationsByCity: { city: string; count: number; gmv: number }[];
  partnersByCity: { city: string; count: number }[];
  topCitiesByGMV: { city: string; gmv: number }[];
}

export interface BehavioralMetrics {
  topCategories: { category: string; count: number; percentage: number }[];
  peakReservationHours: { hour: number; count: number }[];
  avgReservationsPerUser: number;
  repeatUserRate: number; // Percentage of users with >1 reservation
  topPartners: { partner_id: string; business_name: string; reservation_count: number; avg_rating: number }[];
}

// Fetch growth metrics
export function useGrowthMetrics(dateRange?: AnalyticsDateRange) {
  return useQuery({
    queryKey: ['admin', 'analytics', 'growth', dateRange],
    queryFn: async () => {
      const now = new Date();
      const today = startOfDay(now);
      const weekAgo = subDays(now, 7);
      const monthAgo = subDays(now, 30);

      // DAU - users with activity today
      const { count: dau } = await supabase
        .from('reservations')
        .select('customer_id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // WAU - users with activity in last 7 days
      const { count: wau } = await supabase
        .from('reservations')
        .select('customer_id', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      // MAU - users with activity in last 30 days
      const { count: mau } = await supabase
        .from('reservations')
        .select('customer_id', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString());

      // New users
      const { count: newUsersToday } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const { count: newUsersWeek } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      const { count: newUsersMonth } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString());

      // Signup trend (last 30 days)
      const signupTrend: { date: string; count: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        signupTrend.push({
          date: format(date, 'MMM dd'),
          count: count || 0,
        });
      }

      return {
        dau: dau || 0,
        wau: wau || 0,
        mau: mau || 0,
        newUsersToday: newUsersToday || 0,
        newUsersWeek: newUsersWeek || 0,
        newUsersMonth: newUsersMonth || 0,
        signupTrend,
      } as GrowthMetrics;
    },
    staleTime: 60000, // 1 minute
  });
}

// Fetch reservation metrics
export function useReservationMetrics(dateRange?: AnalyticsDateRange) {
  return useQuery({
    queryKey: ['admin', 'analytics', 'reservations', dateRange],
    queryFn: async () => {
      const now = new Date();
      const monthAgo = subDays(now, 30);

      // Total reservations
      const { count: totalReservations } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true });

      // Completed reservations
      const { count: completedReservations } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PICKED_UP', 'COMPLETED']);

      // Cancelled reservations
      const { count: cancelledReservations } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'CANCELLED');

      // Expired reservations
      const { count: expiredReservations } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'EXPIRED');

      // No-shows
      const { count: noShowCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('no_show', true);

      // Pickup rate
      const pickupRate = totalReservations
        ? (completedReservations! / totalReservations!) * 100
        : 0;

      // Average time to pickup (for completed reservations)
      const { data: completedData } = await supabase
        .from('reservations')
        .select('created_at, picked_up_at')
        .in('status', ['PICKED_UP', 'COMPLETED'])
        .not('picked_up_at', 'is', null)
        .limit(100);

      let avgTimeToPickup = 0;
      if (completedData && completedData.length > 0) {
        const totalMinutes = completedData.reduce((sum, r) => {
          const created = new Date(r.created_at);
          const pickedUp = new Date(r.picked_up_at!);
          const diffMinutes = (pickedUp.getTime() - created.getTime()) / 60000;
          return sum + diffMinutes;
        }, 0);
        avgTimeToPickup = totalMinutes / completedData.length;
      }

      // Reservation trend (last 30 days)
      const reservationTrend: { date: string; count: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const { count } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        reservationTrend.push({
          date: format(date, 'MMM dd'),
          count: count || 0,
        });
      }

      // Pickup rate by hour of day
      const pickupRateByHour: { hour: number; pickupRate: number }[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const { count: totalForHour } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthAgo.toISOString());

        const { count: pickedUpForHour } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .in('status', ['PICKED_UP', 'COMPLETED'])
          .gte('created_at', monthAgo.toISOString());

        const rate = totalForHour ? (pickedUpForHour! / totalForHour!) * 100 : 0;
        pickupRateByHour.push({ hour, pickupRate: rate });
      }

      return {
        totalReservations: totalReservations || 0,
        completedReservations: completedReservations || 0,
        cancelledReservations: cancelledReservations || 0,
        expiredReservations: expiredReservations || 0,
        noShowCount: noShowCount || 0,
        pickupRate,
        avgTimeToPickup,
        reservationTrend,
        pickupRateByHour,
      } as ReservationMetrics;
    },
    staleTime: 60000, // 1 minute
  });
}

// Fetch revenue metrics
export function useRevenueMetrics(dateRange?: AnalyticsDateRange) {
  return useQuery({
    queryKey: ['admin', 'analytics', 'revenue', dateRange],
    queryFn: async () => {
      const now = new Date();
      const monthAgo = subDays(now, 30);

      // Total GMV (all completed reservations)
      const { data: completedReservations } = await supabase
        .from('reservations')
        .select('total_price')
        .in('status', ['PICKED_UP', 'COMPLETED']);

      const totalGMV = completedReservations?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
      const totalRevenue = totalGMV * 0.15; // 15% commission

      // Average order value
      const avgOrderValue = completedReservations?.length
        ? totalGMV / completedReservations.length
        : 0;

      // GMV trend (last 30 days)
      const gmvTrend: { date: string; gmv: number; revenue: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const { data } = await supabase
          .from('reservations')
          .select('total_price')
          .in('status', ['PICKED_UP', 'COMPLETED'])
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        const gmv = data?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
        const revenue = gmv * 0.15;

        gmvTrend.push({
          date: format(date, 'MMM dd'),
          gmv,
          revenue,
        });
      }

      // Revenue by partner
      const { data: partnerRevenue } = await supabase
        .from('reservations')
        .select(`
          total_price,
          partner_id,
          partners!inner(id, business_name)
        `)
        .in('status', ['PICKED_UP', 'COMPLETED']);

      const revenueByPartnerMap = new Map<string, { business_name: string; gmv: number }>();
      partnerRevenue?.forEach((r: any) => {
        const partnerId = r.partner_id;
        const existingData = revenueByPartnerMap.get(partnerId) || { business_name: r.partners.business_name, gmv: 0 };
        existingData.gmv += r.total_price || 0;
        revenueByPartnerMap.set(partnerId, existingData);
      });

      const revenueByPartner = Array.from(revenueByPartnerMap.entries())
        .map(([partner_id, data]) => ({
          partner_id,
          business_name: data.business_name,
          gmv: data.gmv,
          revenue: data.gmv * 0.15,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10

      // Revenue by category
      const { data: categoryRevenue } = await supabase
        .from('reservations')
        .select(`
          total_price,
          offers!inner(category)
        `)
        .in('status', ['PICKED_UP', 'COMPLETED']);

      const revenueByCategoryMap = new Map<string, number>();
      categoryRevenue?.forEach((r: any) => {
        const category = r.offers.category || 'Unknown';
        const existing = revenueByCategoryMap.get(category) || 0;
        revenueByCategoryMap.set(category, existing + (r.total_price || 0));
      });

      const revenueByCategory = Array.from(revenueByCategoryMap.entries())
        .map(([category, gmv]) => ({
          category,
          gmv,
          revenue: gmv * 0.15,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        totalGMV,
        totalRevenue,
        avgOrderValue,
        gmvTrend,
        revenueByPartner,
        revenueByCategory,
      } as RevenueMetrics;
    },
    staleTime: 60000, // 1 minute
  });
}

// Fetch geo metrics
export function useGeoMetrics() {
  return useQuery({
    queryKey: ['admin', 'analytics', 'geo'],
    queryFn: async () => {
      // Reservations by city (from partner location)
      const { data: reservationsByCity } = await supabase
        .from('reservations')
        .select(`
          total_price,
          partners!inner(city)
        `);

      const reservationsByCityMap = new Map<string, { count: number; gmv: number }>();
      reservationsByCity?.forEach((r: any) => {
        const city = r.partners.city || 'Unknown';
        const existing = reservationsByCityMap.get(city) || { count: 0, gmv: 0 };
        existing.count += 1;
        existing.gmv += r.total_price || 0;
        reservationsByCityMap.set(city, existing);
      });

      const reservationsByCityArray = Array.from(reservationsByCityMap.entries())
        .map(([city, data]) => ({
          city,
          count: data.count,
          gmv: data.gmv,
        }))
        .sort((a, b) => b.gmv - a.gmv);

      // Partners by city
      const { data: partnersByCity } = await supabase
        .from('partners')
        .select('city')
        .eq('status', 'APPROVED');

      const partnersByCityMap = new Map<string, number>();
      partnersByCity?.forEach((p) => {
        const city = p.city || 'Unknown';
        const existing = partnersByCityMap.get(city) || 0;
        partnersByCityMap.set(city, existing + 1);
      });

      const partnersByCityArray = Array.from(partnersByCityMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count);

      // Top cities by GMV
      const topCitiesByGMV = reservationsByCityArray
        .slice(0, 10)
        .map(({ city, gmv }) => ({ city, gmv }));

      return {
        reservationsByCity: reservationsByCityArray,
        partnersByCity: partnersByCityArray,
        topCitiesByGMV,
      } as GeoMetrics;
    },
    staleTime: 120000, // 2 minutes
  });
}

// Fetch behavioral metrics
export function useBehavioralMetrics() {
  return useQuery({
    queryKey: ['admin', 'analytics', 'behavioral'],
    queryFn: async () => {
      // Top categories
      const { data: categoryData } = await supabase
        .from('reservations')
        .select(`
          offers!inner(category)
        `);

      const categoryCountMap = new Map<string, number>();
      let totalReservations = 0;
      categoryData?.forEach((r: any) => {
        const category = r.offers.category || 'Unknown';
        const existing = categoryCountMap.get(category) || 0;
        categoryCountMap.set(category, existing + 1);
        totalReservations += 1;
      });

      const topCategories = Array.from(categoryCountMap.entries())
        .map(([category, count]) => ({
          category,
          count,
          percentage: (count / totalReservations) * 100,
        }))
        .sort((a, b) => b.count - a.count);

      // Peak reservation hours (extract hour from created_at)
      const { data: hourData } = await supabase
        .from('reservations')
        .select('created_at');

      const hourCountMap = new Map<number, number>();
      hourData?.forEach((r) => {
        const hour = new Date(r.created_at).getHours();
        const existing = hourCountMap.get(hour) || 0;
        hourCountMap.set(hour, existing + 1);
      });

      const peakReservationHours = Array.from(hourCountMap.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => a.hour - b.hour);

      // Avg reservations per user
      const { data: userReservations } = await supabase
        .from('reservations')
        .select('customer_id');

      const userReservationMap = new Map<string, number>();
      userReservations?.forEach((r) => {
        const existing = userReservationMap.get(r.customer_id) || 0;
        userReservationMap.set(r.customer_id, existing + 1);
      });

      const totalUsers = userReservationMap.size;
      const avgReservationsPerUser = totalUsers ? userReservations.length / totalUsers : 0;

      // Repeat user rate (users with >1 reservation)
      const repeatUsers = Array.from(userReservationMap.values()).filter((count) => count > 1).length;
      const repeatUserRate = totalUsers ? (repeatUsers / totalUsers) * 100 : 0;

      // Top partners by reservation count
      const { data: partnerData } = await supabase
        .from('reservations')
        .select(`
          partner_id,
          partners!inner(id, business_name)
        `);

      const partnerReservationMap = new Map<string, { business_name: string; count: number }>();
      partnerData?.forEach((r: any) => {
        const partnerId = r.partner_id;
        const existing = partnerReservationMap.get(partnerId) || { business_name: r.partners.business_name, count: 0 };
        existing.count += 1;
        partnerReservationMap.set(partnerId, existing);
      });

      const topPartners = Array.from(partnerReservationMap.entries())
        .map(([partner_id, data]) => ({
          partner_id,
          business_name: data.business_name,
          reservation_count: data.count,
          avg_rating: 0, // TODO: Add ratings table
        }))
        .sort((a, b) => b.reservation_count - a.reservation_count)
        .slice(0, 10);

      return {
        topCategories,
        peakReservationHours,
        avgReservationsPerUser,
        repeatUserRate,
        topPartners,
      } as BehavioralMetrics;
    },
    staleTime: 120000, // 2 minutes
  });
}
