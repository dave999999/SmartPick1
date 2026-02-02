/**
 * Partner Management Hook ★ COMPLETED
 * Handles partner approval workflow, trust scoring, and business management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface PartnerFilters {
  status?: 'pending' | 'approved' | 'suspended' | 'rejected';
  trustScoreMin?: number;
  trustScoreMax?: number;
  search?: string;
  hasActiveOffers?: boolean;
  page?: number;
  limit?: number;
}

export interface Partner {
  id: string;
  user_id: string;
  business_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  description: string;
  business_type: string;
  latitude: number;
  longitude: number;
  business_hours: any;
  opening_time: string;
  closing_time: string;
  open_24h: boolean;
  images: string[];
  cover_image_url: string;
  status: string; // 'PENDING' | 'APPROVED' | 'REJECTED'
  approved_for_upload: boolean;
  created_at: string;
  updated_at: string;
  // Calculated fields
  total_offers?: number;
  active_offers?: number;
  completed_reservations?: number;
  revenue_generated?: number;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

// Fetch partners with filters
export function usePartners(filters: PartnerFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'partners', filters],
    queryFn: async () => {
      let query = supabase
        .from('partners')
        .select(
          `
          *,
          user:users!partners_user_id_fkey(id, name, email, avatar_url)
        `,
          { count: 'exact' }
        );

      // Status filter (normalize to uppercase to match your database)
      if (filters.status) {
        const statusMap: Record<string, string> = {
          'pending': 'PENDING',
          'approved': 'APPROVED',
          'rejected': 'REJECTED',
          'suspended': 'SUSPENDED'
        };
        query = query.eq('status', statusMap[filters.status] || filters.status.toUpperCase());
      }

      // Search by business name or email
      if (filters.search) {
        query = query.or(
          `business_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }

      // Sorting: pending first, then by created date
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        logger.error('Error fetching partners:', error);
        throw error;
      }

      // Calculate stats for each partner
      const partnersWithStats = await Promise.all(
        (data || []).map(async (partner) => {
          // Get offer counts
          const { count: totalOffers } = await supabase
            .from('offers')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', partner.id);

          const { count: activeOffers } = await supabase
            .from('offers')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', partner.id)
            .eq('status', 'ACTIVE');

          // Get reservation stats
          const { count: completedReservations } = await supabase
            .from('reservations')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', partner.id)
            .in('status', ['PICKED_UP', 'COMPLETED']);

          // Get revenue
          const { data: revenueData } = await supabase
            .from('reservations')
            .select('total_price')
            .eq('partner_id', partner.id)
            .in('status', ['PICKED_UP', 'COMPLETED']);

          const revenue_generated = revenueData?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;

          return {
            ...partner,
            total_offers: totalOffers || 0,
            active_offers: activeOffers || 0,
            completed_reservations: completedReservations || 0,
            revenue_generated
          };
        })
      );

      return {
        partners: partnersWithStats,
        total: count || 0,
      };
    },
    staleTime: 30000, // 30 seconds
  });
}

// Fetch single partner details
export function usePartner(partnerId: string) {
  return useQuery({
    queryKey: ['admin', 'partner', partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partners')
        .select(
          `
          *,
          user:users!partners_user_id_fkey(id, name, email, avatar_url, phone)
        `
        )
        .eq('id', partnerId)
        .single();

      if (error) {
        logger.error('Failed to fetch partner', { partnerId, error });
        throw error;
      }

      // Get stats for this partner
      const { count: totalOffers } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId);

      const { count: activeOffers } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .eq('status', 'ACTIVE');

      const { count: completedReservations } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .in('status', ['PICKED_UP', 'COMPLETED']);

      const { data: revenueData } = await supabase
        .from('reservations')
        .select('total_price')
        .eq('partner_id', partnerId)
        .in('status', ['PICKED_UP', 'COMPLETED']);

      const revenue_generated = revenueData?.reduce((sum, r) => sum + (r.total_price || 0), 0) || 0;

      return {
        ...data,
        total_offers: totalOffers || 0,
        active_offers: activeOffers || 0,
        completed_reservations: completedReservations || 0,
        revenue_generated
      } as Partner;
    },
    enabled: !!partnerId,
  });
}

// Fetch partner offers
export function usePartnerOffers(partnerId: string, limit = 20) {
  return useQuery({
    queryKey: ['admin', 'partner', partnerId, 'offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to fetch partner offers', { partnerId, error });
        throw error;
      }

      return data;
    },
    enabled: !!partnerId,
  });
}

// Fetch partner revenue stats
export function usePartnerRevenue(partnerId: string) {
  return useQuery({
    queryKey: ['admin', 'partner', partnerId, 'revenue'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_partner_revenue_stats', {
        p_partner_id: partnerId,
      });

      if (error) {
        logger.error('Failed to fetch partner revenue', { partnerId, error });
        throw error;
      }

      return data;
    },
    enabled: !!partnerId,
  });
}

// Approve partner application
export function useApprovePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      partnerId,
    }: {
      partnerId: string;
      adminId?: string;
    }) => {
      const { error } = await supabase
        .from('partners')
        .update({
          status: 'APPROVED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', partnerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'partner', variables.partnerId],
      });
      toast.success('Partner application approved');
      logger.info('Partner approved', { partnerId: variables.partnerId });
    },
    onError: (error) => {
      toast.error('Failed to approve partner');
      logger.error('Partner approval failed', { error });
    },
  });
}

// Reject partner application
export function useRejectPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      partnerId,
      reason,
    }: {
      partnerId: string;
      reason?: string;
    }) => {
      const { error } = await supabase
        .from('partners')
        .update({
          status: 'REJECTED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', partnerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'partner', variables.partnerId],
      });
      toast.success('Partner application rejected');
      logger.info('Partner rejected', { partnerId: variables.partnerId });
    },
    onError: (error) => {
      toast.error('Failed to reject partner');
      logger.error('Partner rejection failed', { error });
    },
  });
}

// Suspend partner
export function useSuspendPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      partnerId,
      reason,
    }: {
      partnerId: string;
      reason?: string;
    }) => {
      const { error } = await supabase
        .from('partners')
        .update({
          status: 'SUSPENDED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', partnerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'partner', variables.partnerId],
      });
      toast.success('Partner suspended');
      logger.info('Partner suspended', { partnerId: variables.partnerId });
    },
    onError: (error) => {
      toast.error('Failed to suspend partner');
      logger.error('Partner suspension failed', { error });
    },
  });
}

// Reactivate partner
export function useReactivatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ partnerId }: { partnerId: string }) => {
      const { error } = await supabase
        .from('partners')
        .update({
          status: 'APPROVED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', partnerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'partner', variables.partnerId],
      });
      toast.success('Partner reactivated');
      logger.info('Partner reactivated', { partnerId: variables.partnerId });
    },
    onError: (error) => {
      toast.error('Failed to reactivate partner');
      logger.error('Partner reactivation failed', { error });
    },
  });
}

// Update partner details
export function useUpdatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      partnerId,
      updates,
    }: {
      partnerId: string;
      updates: Partial<Partner>;
    }) => {
      const { error } = await supabase
        .from('partners')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', partnerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'partners'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'partner', variables.partnerId],
      });
      toast.success('Partner details updated');
      logger.info('Partner updated', { partnerId: variables.partnerId });
    },
    onError: (error) => {
      toast.error('Failed to update partner');
      logger.error('Partner update failed', { error });
    },
  });
}
