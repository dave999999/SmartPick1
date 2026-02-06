/**
 * Reservation Monitoring Hook ★ COMPLETED
 * Real-time reservation monitoring with extend, cancel, and force complete
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface ReservationFilters {
  status?: 'ACTIVE' | 'RESERVED' | 'READY_FOR_PICKUP' | 'IN_PROGRESS' | 'PICKED_UP' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW';
  urgency?: 'critical' | 'warning' | 'normal';
  userId?: string;
  partnerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface Reservation {
  id: string;
  customer_id: string;
  offer_id: string;
  partner_id: string;
  status: 'ACTIVE' | 'RESERVED' | 'READY_FOR_PICKUP' | 'IN_PROGRESS' | 'PICKED_UP' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW';
  qr_code: string;
  quantity: number;
  total_price: number;
  points_spent: number;
  no_show: boolean;
  expires_at: string;
  picked_up_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  offer?: {
    id: string;
    title: string;
    category: string;
    partner_id: string;
  };
  partner?: {
    id: string;
    business_name: string;
  };
}

// Fetch reservations with filters
export function useReservations(filters: ReservationFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'reservations', filters],
    queryFn: async () => {
      let query = supabase
        .from('reservations')
        .select(
          `
          *,
          user:users!reservations_customer_id_fkey(id, name, email, avatar_url),
          offer:offers!reservations_offer_id_fkey(id, title, category, partner_id),
          partner:partners!reservations_partner_id_fkey(id, business_name)
        `,
          { count: 'exact' }
        );

      // Status filter (case-insensitive)
      if (filters.status) {
        query = query.eq('status', filters.status.toUpperCase());
      }

      // Urgency filter (time-based)
      if (filters.urgency === 'critical') {
        const now = new Date();
        const criticalTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
        query = query
          .in('status', ['ACTIVE', 'RESERVED', 'READY_FOR_PICKUP'])
          .lte('expires_at', criticalTime.toISOString())
          .gt('expires_at', now.toISOString());
      } else if (filters.urgency === 'warning') {
        const now = new Date();
        const warningTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
        const criticalTime = new Date(now.getTime() + 15 * 60 * 1000);
        query = query
          .in('status', ['ACTIVE', 'RESERVED', 'READY_FOR_PICKUP'])
          .lte('expires_at', warningTime.toISOString())
          .gt('expires_at', criticalTime.toISOString());
      } else if (filters.urgency === 'normal') {
        const now = new Date();
        const warningTime = new Date(now.getTime() + 60 * 60 * 1000);
        query = query
          .in('status', ['ACTIVE', 'RESERVED', 'READY_FOR_PICKUP'])
          .gt('expires_at', warningTime.toISOString());
      }

      // User filter
      if (filters.userId) {
        query = query.eq('customer_id', filters.userId);
      }

      // Partner filter
      if (filters.partnerId) {
        query = query.eq('partner_id', filters.partnerId);
      }

      // Search by QR code
      if (filters.search) {
        query = query.ilike('qr_code', `%${filters.search}%`);
      }

      // Sorting: show newest reservations first
      query = query.order('created_at', { ascending: false });

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch reservations', { error });
        throw error;
      }

      return {
        reservations: (data as Reservation[]) || [],
        total: count || 0,
        page,
        pages: Math.ceil((count || 0) / limit),
      };
    },
    staleTime: 5000, // 5 seconds for real-time feel
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

// Fetch single reservation
export function useReservation(reservationId: string) {
  return useQuery({
    queryKey: ['admin', 'reservation', reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(
          `
          *,
          user:users!reservations_customer_id_fkey(id, name, email, avatar_url, phone_number),
          offer:offers!reservations_offer_id_fkey(
            id,
            title,
            description,
            category,
            partner_id
          ),
          partner:partners!reservations_partner_id_fkey(
            id,
            business_name,
            business_email,
            business_phone
          )
        `
        )
        .eq('id', reservationId)
        .single();

      if (error) {
        logger.error('Failed to fetch reservation', { reservationId, error });
        throw error;
      }

      return data as Reservation;
    },
    enabled: !!reservationId,
  });
}

// Fetch reservation stats (calculated from actual data)
export function useReservationStats() {
  return useQuery({
    queryKey: ['admin', 'reservation-stats'],
    queryFn: async () => {
      // Get all reservations with their status
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('id, status, created_at, picked_up_at, no_show');

      if (error) {
        logger.error('Failed to fetch reservations for stats', { error });
        throw error;
      }

      // Calculate stats from actual data
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      
      return {
        total: reservations?.length || 0,
        active: reservations?.filter(r => r.status?.toUpperCase() === 'ACTIVE' || r.status?.toUpperCase() === 'RESERVED').length || 0,
        picked_up: reservations?.filter(r => r.picked_up_at).length || 0,
        no_shows: reservations?.filter(r => r.no_show).length || 0,
        completed_today: reservations?.filter(r => {
          if (!r.picked_up_at) return false;
          const pickedUpDate = new Date(r.picked_up_at);
          return pickedUpDate >= today;
        }).length || 0,
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000,
  });
}

// Extend reservation time
export function useExtendReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reservationId,
      additionalMinutes,
      reason,
    }: {
      reservationId: string;
      additionalMinutes: number;
      reason: string;
    }) => {
      // Fetch current expiration
      const { data: reservation, error: fetchError } = await supabase
        .from('reservations')
        .select('expires_at')
        .eq('id', reservationId)
        .single();

      if (fetchError) throw fetchError;

      const currentExpiry = new Date(reservation.expires_at);
      const newExpiry = new Date(
        currentExpiry.getTime() + additionalMinutes * 60 * 1000
      );

      const { error } = await supabase
        .from('reservations')
        .update({
          expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId);

      if (error) throw error;

      // Log the extension
      await supabase.from('reservation_extensions').insert({
        reservation_id: reservationId,
        additional_minutes: additionalMinutes,
        reason,
        extended_by: (await supabase.auth.getUser()).data.user?.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reservations'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'reservation', variables.reservationId],
      });
      toast.success(`Reservation extended by ${variables.additionalMinutes} minutes`);
      logger.info('Reservation extended', {
        reservationId: variables.reservationId,
        minutes: variables.additionalMinutes,
      });
    },
    onError: (error) => {
      toast.error('Failed to extend reservation');
      logger.error('Reservation extension failed', { error });
    },
  });
}

// Force complete reservation (admin override)
export function useForceCompleteReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reservationId,
      notes,
    }: {
      reservationId: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('reservations')
        .update({
          status: 'COMPLETED',
          picked_up_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId);

      if (error) throw error;

      // Log the force completion
      if (notes) {
        await supabase.from('reservation_admin_actions').insert({
          reservation_id: reservationId,
          action: 'force_complete',
          notes,
          admin_id: (await supabase.auth.getUser()).data.user?.id,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reservations'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'reservation', variables.reservationId],
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reservation-stats'] });
      toast.success('Reservation marked as completed');
      logger.info('Reservation force completed', {
        reservationId: variables.reservationId,
      });
    },
    onError: (error) => {
      toast.error('Failed to complete reservation');
      logger.error('Force complete failed', { error });
    },
  });
}

// Cancel reservation (admin override)
export function useCancelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reservationId,
      reason,
      refundPoints,
    }: {
      reservationId: string;
      reason: string;
      refundPoints: boolean;
    }) => {
      // Fetch reservation for refund
      const { data: reservation, error: fetchError } = await supabase
        .from('reservations')
        .select('customer_id, points_spent')
        .eq('id', reservationId)
        .single();

      if (fetchError) throw fetchError;

      // Update reservation status
      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          status: 'CANCELLED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId);

      if (updateError) throw updateError;

      // Refund points if requested
      if (refundPoints) {
        const { error: refundError } = await supabase.rpc('admin_adjust_user_points', {
          p_user_id: reservation.customer_id,
          p_amount: reservation.points_spent,
          p_reason: `Refund for cancelled reservation - Admin: ${reason}`,
          p_metadata: { reservation_id: reservationId, admin_action: 'refund' },
        });
        if (refundError) throw refundError;
      }

      // Log the cancellation
      await supabase.from('reservation_admin_actions').insert({
        reservation_id: reservationId,
        action: 'cancel',
        notes: `Reason: ${reason}, Refunded: ${refundPoints}`,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reservations'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'reservation', variables.reservationId],
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reservation-stats'] });
      toast.success(
        variables.refundPoints
          ? 'Reservation cancelled with points refunded'
          : 'Reservation cancelled'
      );
      logger.info('Reservation cancelled', {
        reservationId: variables.reservationId,
        refund: variables.refundPoints,
      });
    },
    onError: (error) => {
      toast.error('Failed to cancel reservation');
      logger.error('Reservation cancellation failed', { error });
    },
  });
}

// Update reservation status
export function useUpdateReservationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reservationId,
      status,
    }: {
      reservationId: string;
      status: 'ACTIVE' | 'RESERVED' | 'READY_FOR_PICKUP' | 'IN_PROGRESS' | 'PICKED_UP' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW';
    }) => {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if ((status === 'COMPLETED' || status === 'PICKED_UP') && !updates.picked_up_at) {
        updates.picked_up_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('reservations')
        .update(updates)
        .eq('id', reservationId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reservations'] });
      queryClient.invalidateQueries({
        queryKey: ['admin', 'reservation', variables.reservationId],
      });
      toast.success('Reservation status updated');
      logger.info('Reservation status updated', {
        reservationId: variables.reservationId,
        status: variables.status,
      });
    },
    onError: (error) => {
      toast.error('Failed to update status');
      logger.error('Status update failed', { error });
    },
  });
}
