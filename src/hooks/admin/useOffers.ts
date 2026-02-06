/**
 * Offer Management Hook ★ COMPLETED
 * Emergency controls, flagging, and offer lifecycle management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface OfferFilters {
  status?: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'SOLD_OUT' | 'CANCELLED';
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
  images: string[];
  original_price: number;
  smart_price: number;
  quantity_available: number;
  quantity_total: number;
  pickup_start: string;
  pickup_end: string;
  expires_at: string;
  auto_expire_in: number | null;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'SOLD_OUT' | 'CANCELLED';
  created_at: string;
  updated_at: string;
  partner?: {
    id: string;
    business_name: string;
    email: string;
    phone: string;
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
          partner:partners!inner(id, business_name, email, phone)
        `,
          { count: 'exact' }
        );

      // Status filter
      if (filters.status) {
        query = query.eq('status', filters.status.toUpperCase());
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
        query = query.gte('smart_price', filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte('smart_price', filters.maxPrice);
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

      // Sorting: by created_at desc
      query = query.order('created_at', { ascending: false });

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
          partner:partners!inner(
            id,
            business_name,
            email,
            phone
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
          status: 'PAUSED',
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
          status: 'ACTIVE',
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
          status: 'PAUSED',
          updated_at: new Date().toISOString(),
        });

      if (partnerId) {
        query = query.eq('partner_id', partnerId);
      } else {
        query = query.eq('status', 'ACTIVE');
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

// Update offer (admin edit)
export function useUpdateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      offerId,
      updates,
    }: {
      offerId: string;
        updates: {
          title?: string;
          description?: string;
          category?: string;
          original_price?: number;
          smart_price?: number;
          images?: string[];
          quantity_available?: number;
          quantity_total?: number;
          pickup_start?: string;
          pickup_end?: string;
          expires_at?: string;
      };
    }) => {
      const { error } = await supabase
        .from('offers')
        .update({
          ...updates,
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
      toast.success('Offer updated successfully');
      logger.info('Offer updated by admin', { offerId: variables.offerId });
    },
    onError: (error) => {
      toast.error('Failed to update offer');
      logger.error('Offer update failed', { error });
    },
  });
}
