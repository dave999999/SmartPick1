/**
 * Offer Management Hook ★ COMPLETED
 * Emergency controls, flagging, and offer lifecycle management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface OfferFilters {
  status?: 'active' | 'paused' | 'flagged' | 'expired';
  partnerId?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  expiringWithin?: number; // hours
  page?: number;
  limit?: number;
}

export interface Offer {
  id: string;
  partner_id: string;
  title: string;
  description: string;
  category: string;
  points_cost: number;
  original_price: number;
  discount_percentage: number;
  quantity_available: number;
  quantity_redeemed: number;
  reservation_duration_minutes: number;
  active: boolean;
  flagged: boolean;
  flag_reason?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  partner?: {
    id: string;
    business_name: string;
    business_email: string;
    trust_score: number;
  };
}

// Fetch offers with filters
export function useOffers(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'offers', filters],
    queryFn: async () => {
      let query = supabase
        .from('offers')
        .select(
          `
          *,
          partner:partners!offers_partner_id_fkey(
            id,
            business_name,
            business_email,
            trust_score
          )
        `,
          { count: 'exact' }
        );

      // Status filter
      if (filters.status === 'active') {
        query = query.eq('active', true).eq('flagged', false).gt('expires_at', new Date().toISOString());
      } else if (filters.status === 'paused') {
        query = query.eq('active', false);
      } else if (filters.status === 'flagged') {
        query = query.eq('flagged', true);
      } else if (filters.status === 'expired') {
        query = query.lte('expires_at', new Date().toISOString());
      }

      // Partner filter
      if (filters.partnerId) {
        query = query.eq('partner_id', filters.partnerId);
      }

      // Category filter
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      // Price range
      if (filters.minPrice !== undefined) {
        query = query.gte('points_cost', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('points_cost', filters.maxPrice);
      }

      // Search by title
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      // Expiring within X hours
      if (filters.expiringWithin) {
        const futureDate = new Date();
        futureDate.setHours(futureDate.getHours() + filters.expiringWithin);
        query = query
          .lte('expires_at', futureDate.toISOString())
          .gt('expires_at', new Date().toISOString());
      }

      // Sorting: flagged first, then by created_at desc
      query = query.order('flagged', { ascending: false }).order('created_at', {
        ascending: false,
      });

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch offers', { error });
        throw error;
      }

      return {
        offers: (data as Offer[]) || [],
        total: count || 0,
        page,
        pages: Math.ceil((count || 0) / limit),
      };
    },
    staleTime: 10000, // 10 seconds
  });
}

// Fetch single offer details
export function useOffer(offerId: string) {
  return useQuery({
    queryKey: ['admin', 'offer', offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select(
          `
          *,
          partner:partners!offers_partner_id_fkey(
            id,
            business_name,
            business_email,
            business_phone,
            trust_score
          )
        `
        )
        .eq('id', offerId)
        .single();

      if (error) {
        logger.error('Failed to fetch offer', { offerId, error });
        throw error;
      }

      return data as Offer;
    },
    enabled: !!offerId,
  });
}

// Fetch offer stats
export function useOfferStats() {
  return useQuery({
    queryKey: ['admin', 'offer-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_offer_stats');

      if (error) {
        logger.error('Failed to fetch offer stats', { error });
        throw error;
      }

      return data;
    },
    staleTime: 30000, // 30 seconds
  });
}

// Pause offer
export function usePauseOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId }: { offerId: string }) => {
      const { error } = await supabase
        .from('offers')
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'offers'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'offer', variables.offerId],
      });
      toast.success('Offer paused');
      logger.info('Offer paused', { offerId: variables.offerId });
    },
    onError: (error) => {
      toast.error('Failed to pause offer');
      logger.error('Offer pause failed', { error });
    },
  });
}

// Resume offer
export function useResumeOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId }: { offerId: string }) => {
      const { error } = await supabase
        .from('offers')
        .update({
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'offers'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'offer', variables.offerId],
      });
      toast.success('Offer resumed');
      logger.info('Offer resumed', { offerId: variables.offerId });
    },
    onError: (error) => {
      toast.error('Failed to resume offer');
      logger.error('Offer resume failed', { error });
    },
  });
}

// Flag offer
export function useFlagOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId, reason }: { offerId: string; reason: string }) => {
      const { error } = await supabase
        .from('offers')
        .update({
          flagged: true,
          flag_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'offers'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'offer', variables.offerId],
      });
      toast.success('Offer flagged');
      logger.info('Offer flagged', { offerId: variables.offerId });
    },
    onError: (error) => {
      toast.error('Failed to flag offer');
      logger.error('Offer flag failed', { error });
    },
  });
}

// Unflag offer
export function useUnflagOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId }: { offerId: string }) => {
      const { error } = await supabase
        .from('offers')
        .update({
          flagged: false,
          flag_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'offers'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'offer', variables.offerId],
      });
      toast.success('Offer unflagged');
      logger.info('Offer unflagged', { offerId: variables.offerId });
    },
    onError: (error) => {
      toast.error('Failed to unflag offer');
      logger.error('Offer unflag failed', { error });
    },
  });
}

// Delete offer (admin override)
export function useDeleteOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId }: { offerId: string }) => {
      const { error } = await supabase.from('offers').delete().eq('id', offerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'offers'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'offer-stats'] });
      toast.success('Offer deleted');
      logger.info('Offer deleted by admin');
    },
    onError: (error) => {
      toast.error('Failed to delete offer');
      logger.error('Offer deletion failed', { error });
    },
  });
}

// Pause all offers (emergency)
export function usePauseAllOffers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ partnerId }: { partnerId?: string }) => {
      let query = supabase
        .from('offers')
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        });

      if (partnerId) {
        query = query.eq('partner_id', partnerId);
      } else {
        query = query.eq('active', true);
      }

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'offers'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'offer-stats'] });
      toast.success(
        variables.partnerId
          ? 'All partner offers paused'
          : 'All offers paused (EMERGENCY)'
      );
      logger.warn('Bulk pause executed', { partnerId: variables.partnerId });
    },
    onError: (error) => {
      toast.error('Failed to pause offers');
      logger.error('Bulk pause failed', { error });
    },
  });
}

// Extend offer expiration
export function useExtendOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      offerId,
      additionalHours,
    }: {
      offerId: string;
      additionalHours: number;
    }) => {
      // Fetch current expiration
      const { data: offer, error: fetchError } = await supabase
        .from('offers')
        .select('expires_at')
        .eq('id', offerId)
        .single();

      if (fetchError) throw fetchError;

      const currentExpiry = new Date(offer.expires_at);
      const newExpiry = new Date(
        currentExpiry.getTime() + additionalHours * 60 * 60 * 1000
      );

      const { error } = await supabase
        .from('offers')
        .update({
          expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', offerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'offers'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'offer', variables.offerId],
      });
      toast.success(`Offer extended by ${variables.additionalHours} hours`);
      logger.info('Offer expiration extended', {
        offerId: variables.offerId,
        hours: variables.additionalHours,
      });
    },
    onError: (error) => {
      toast.error('Failed to extend offer');
      logger.error('Offer extension failed', { error });
    },
  });
}
