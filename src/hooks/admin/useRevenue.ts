/**
 * Revenue Hook ★ NEW
 * Financial tracking, commission management, and partner payouts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { subDays, startOfMonth, endOfMonth, format } from 'date-fns';

export interface RevenueOverview {
  totalGMV: number;
  totalCommission: number;
  pendingPayouts: number;
  paidPayouts: number;
  avgCommissionPerTransaction: number;
}

export interface PartnerRevenue {
  partner_id: string;
  business_name: string;
  totalGMV: number;
  totalCommission: number;
  reservationCount: number;
  lastPayoutDate: string | null;
  pendingAmount: number;
}

export interface PayoutRecord {
  id: string;
  partner_id: string;
  business_name: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  paid_at: string | null;
  payment_method: string | null;
  transaction_id: string | null;
  created_at: string;
}

// Fetch revenue overview
export function useRevenueOverview() {
  return useQuery({
    queryKey: ['admin', 'revenue', 'overview'],
    queryFn: async () => {
      // Total GMV from completed reservations
      const { data: completedReservations } = await supabase
        .from('reservations')
        .select('total_price')
        .in('status', ['PICKED_UP', 'COMPLETED']);

      const totalGMV = completedReservations?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
      const totalCommission = totalGMV * 0.15; // 15% commission

      // Check if partner_payouts table exists, if not return mock data
      const { data: payoutsData, error: payoutsError } = await supabase
        .from('partner_payouts')
        .select('amount, status');

      let pendingPayouts = 0;
      let paidPayouts = 0;

      if (!payoutsError && payoutsData) {
        pendingPayouts = payoutsData
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + (p.amount || 0), 0);
        
        paidPayouts = payoutsData
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + (p.amount || 0), 0);
      } else {
        // Table doesn't exist yet - calculate from reservations
        pendingPayouts = totalCommission; // All commission is pending until table is created
        paidPayouts = 0;
      }

      // Average commission per transaction
      const transactionCount = completedReservations?.length || 1;
      const avgCommissionPerTransaction = totalCommission / transactionCount;

      return {
        totalGMV,
        totalCommission,
        pendingPayouts,
        paidPayouts,
        avgCommissionPerTransaction,
      } as RevenueOverview;
    },
    staleTime: 60000, // 1 minute
  });
}

// Fetch revenue by partner
export function usePartnerRevenue() {
  return useQuery({
    queryKey: ['admin', 'revenue', 'by-partner'],
    queryFn: async () => {
      // Get all completed reservations with partner info
      const { data: reservations } = await supabase
        .from('reservations')
        .select(`
          total_price,
          created_at,
          partner_id,
          partners!inner(id, business_name)
        `)
        .in('status', ['PICKED_UP', 'COMPLETED']);

      // Group by partner
      const partnerMap = new Map<string, {
        business_name: string;
        totalGMV: number;
        totalCommission: number;
        reservationCount: number;
        lastPayoutDate: string | null;
      }>();

      reservations?.forEach((r: any) => {
        const partnerId = r.partner_id;
        const existing = partnerMap.get(partnerId) || {
          business_name: r.partners.business_name,
          totalGMV: 0,
          totalCommission: 0,
          reservationCount: 0,
          lastPayoutDate: null,
        };

        existing.totalGMV += r.total_price || 0;
        existing.totalCommission += (r.total_price || 0) * 0.15;
        existing.reservationCount += 1;

        partnerMap.set(partnerId, existing);
      });

      // Check for last payout dates (if table exists)
      const { data: payouts } = await supabase
        .from('partner_payouts')
        .select('partner_id, paid_at')
        .eq('status', 'paid')
        .order('paid_at', { ascending: false });

      const lastPayoutMap = new Map<string, string>();
      payouts?.forEach(p => {
        if (!lastPayoutMap.has(p.partner_id)) {
          lastPayoutMap.set(p.partner_id, p.paid_at);
        }
      });

      // Convert to array
      const partnerRevenue: PartnerRevenue[] = Array.from(partnerMap.entries())
        .map(([partner_id, data]) => ({
          partner_id,
          business_name: data.business_name,
          totalGMV: data.totalGMV,
          totalCommission: data.totalCommission,
          reservationCount: data.reservationCount,
          lastPayoutDate: lastPayoutMap.get(partner_id) || null,
          pendingAmount: data.totalCommission, // All unpaid for now
        }))
        .sort((a, b) => b.totalCommission - a.totalCommission);

      return partnerRevenue;
    },
    staleTime: 60000,
  });
}

// Fetch revenue trend (last 30 days)
export function useRevenueTrend() {
  return useQuery({
    queryKey: ['admin', 'revenue', 'trend'],
    queryFn: async () => {
      const now = new Date();
      const trend: { date: string; gmv: number; commission: number; transactions: number }[] = [];

      for (let i = 29; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const { data } = await supabase
          .from('reservations')
          .select('total_price')
          .in('status', ['PICKED_UP', 'COMPLETED'])
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        const gmv = data?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
        const commission = gmv * 0.15;

        trend.push({
          date: format(date, 'MMM dd'),
          gmv,
          commission,
          transactions: data?.length || 0,
        });
      }

      return trend;
    },
    staleTime: 120000,
  });
}

// Fetch revenue by category
export function useRevenueByCategory() {
  return useQuery({
    queryKey: ['admin', 'revenue', 'by-category'],
    queryFn: async () => {
      const { data } = await supabase
        .from('reservations')
        .select(`
          total_price,
          offers!inner(category)
        `)
        .in('status', ['PICKED_UP', 'COMPLETED']);

      const categoryMap = new Map<string, { gmv: number; commission: number; count: number }>();
      
      data?.forEach((r: any) => {
        const category = r.offers.category || 'Unknown';
        const existing = categoryMap.get(category) || { gmv: 0, commission: 0, count: 0 };
        
        existing.gmv += r.total_price || 0;
        existing.commission += (r.total_price || 0) * 0.15;
        existing.count += 1;

        categoryMap.set(category, existing);
      });

      return Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.commission - a.commission);
    },
    staleTime: 120000,
  });
}

// Fetch payout records (if table exists)
export function usePayoutRecords() {
  return useQuery({
    queryKey: ['admin', 'revenue', 'payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_payouts')
        .select(`
          *,
          partners!inner(business_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // Table doesn't exist yet
        logger.warn('partner_payouts table not found', { error });
        return [];
      }

      return data.map((p: any) => ({
        ...p,
        business_name: p.partners.business_name,
      })) as PayoutRecord[];
    },
    staleTime: 30000,
  });
}

// Create payout batch
export function useCreatePayoutBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ partner_ids, period_start, period_end }: {
      partner_ids: string[];
      period_start: string;
      period_end: string;
    }) => {
      // Get revenue for each partner in the period
      const payouts = [];

      for (const partnerId of partner_ids) {
        const { data } = await supabase
          .from('reservations')
          .select('total_price')
          .eq('partner_id', partnerId)
          .in('status', ['PICKED_UP', 'COMPLETED'])
          .gte('created_at', period_start)
          .lte('created_at', period_end);

        const gmv = data?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;
        const commission = gmv * 0.15;

        if (commission > 0) {
          payouts.push({
            partner_id: partnerId,
            amount: commission,
            period_start,
            period_end,
            status: 'pending',
          });
        }
      }

      // Insert payouts (will fail if table doesn't exist)
      const { error } = await supabase
        .from('partner_payouts')
        .insert(payouts);

      if (error) {
        throw new Error('Failed to create payout batch. Ensure partner_payouts table exists.');
      }

      return payouts;
    },
    onSuccess: () => {
      toast.success('Payout batch created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'revenue'] });
    },
    onError: (error: any) => {
      logger.error('Failed to create payout batch', { error });
      toast.error(error.message || 'Failed to create payout batch');
    },
  });
}

// Mark payout as paid
export function useMarkPayoutPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      payout_id, 
      transaction_id, 
      payment_method 
    }: {
      payout_id: string;
      transaction_id?: string;
      payment_method?: string;
    }) => {
      const { error } = await supabase
        .from('partner_payouts')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          transaction_id,
          payment_method,
        })
        .eq('id', payout_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Payout marked as paid');
      queryClient.invalidateQueries({ queryKey: ['admin', 'revenue'] });
    },
    onError: (error: any) => {
      logger.error('Failed to mark payout as paid', { error });
      toast.error('Failed to update payout status');
    },
  });
}
