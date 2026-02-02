/**
 * useTickets Hook
 * Fetch and manage support tickets
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface TicketFilters {
  status?: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  topic?: string;
  slaAtRisk?: boolean;
  unassigned?: boolean;
  page?: number;
  limit?: number;
}

export interface Ticket {
  id: string;
  ticket_id: string;
  full_name: string;
  email: string;
  phone?: string;
  topic: 'technical' | 'reservation' | 'partnership' | 'general' | 'other';
  message: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  resolved_at?: string;
  resolved_by?: string;
  internal_notes?: string;
  sla_due_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_admin?: {
    name: string;
    email: string;
    avatar_url?: string;
  };
}

/**
 * Fetch tickets with filters
 */
export function useTickets(filters: TicketFilters = {}) {
  const { page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: ['admin', 'tickets', filters],
    queryFn: async () => {
      let query = supabase
        .from('contact_submissions')
        .select(
          `
          *,
          assigned_admin:users!assigned_to(name, email, avatar_url)
        `,
          { count: 'exact' }
        );

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      if (filters.topic) {
        query = query.eq('topic', filters.topic);
      }

      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      if (filters.unassigned) {
        query = query.is('assigned_to', null);
      }

      if (filters.slaAtRisk) {
        // SLA at risk: less than 1 hour remaining and not resolved
        const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        query = query
          .lt('sla_due_at', oneHourFromNow)
          .not('status', 'in', '(resolved,closed)');
      }

      // Sort by priority (urgent first) then created_at (newest first)
      query = query
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      // Pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        tickets: (data || []) as Ticket[],
        total: count || 0,
        page,
        pages: Math.ceil((count || 0) / limit),
      };
    },
    staleTime: 10000, // 10 seconds (tickets update frequently)
  });
}

/**
 * Fetch single ticket details
 */
export function useTicket(ticketId: string | null) {
  return useQuery({
    queryKey: ['admin', 'ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;

      const { data, error } = await supabase
        .from('contact_submissions')
        .select(
          `
          *,
          assigned_admin:users!assigned_to(name, email, avatar_url),
          resolved_admin:users!resolved_by(name, email)
        `
        )
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      return data as Ticket;
    },
    enabled: !!ticketId,
  });
}

/**
 * Fetch ticket conversation messages
 */
export function useTicketMessages(ticketId: string | null) {
  return useQuery({
    queryKey: ['admin', 'ticket', ticketId, 'messages'],
    queryFn: async () => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from('ticket_messages')
        .select(
          `
          *,
          sender:users!sender_id(name, email, avatar_url)
        `
        )
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!ticketId,
  });
}

/**
 * Fetch ticket stats for dashboard
 */
export function useTicketStats() {
  return useQuery({
    queryKey: ['admin', 'ticket-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ticket_stats');

      if (error) throw error;
      return data?.[0] || {
        total_tickets: 0,
        unassigned_tickets: 0,
        pending_tickets: 0,
        sla_at_risk: 0,
        resolved_today: 0,
      };
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Assign ticket mutation
 */
export function useAssignTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      adminId,
    }: {
      ticketId: string;
      adminId: string;
    }) => {
      logger.log('Admin: Assigning ticket', { ticketId, adminId });

      const { data, error } = await supabase.rpc('assign_ticket', {
        p_ticket_id: ticketId,
        p_admin_id: adminId,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast.success('Ticket assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ticket-stats'] });
    },
    onError: (error) => {
      logger.error('Failed to assign ticket:', error);
      toast.error('Failed to assign ticket');
    },
  });
}

/**
 * Add message to ticket mutation
 */
export function useAddTicketMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      senderId,
      message,
      isInternal = false,
      attachments = [],
    }: {
      ticketId: string;
      senderId: string;
      message: string;
      isInternal?: boolean;
      attachments?: any[];
    }) => {
      logger.log('Admin: Adding ticket message', { ticketId, isInternal });

      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_id: senderId,
        sender_type: 'admin',
        message,
        is_internal: isInternal,
        attachments,
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isInternal ? 'Internal note added' : 'Message sent to user'
      );
      queryClient.invalidateQueries({
        queryKey: ['admin', 'ticket', variables.ticketId, 'messages'],
      });
    },
    onError: (error) => {
      logger.error('Failed to add message:', error);
      toast.error('Failed to send message');
    },
  });
}

/**
 * Resolve ticket mutation
 */
export function useResolveTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      adminId,
      resolutionNotes,
    }: {
      ticketId: string;
      adminId: string;
      resolutionNotes?: string;
    }) => {
      logger.log('Admin: Resolving ticket', { ticketId, adminId });

      const { data, error } = await supabase.rpc('resolve_ticket', {
        p_ticket_id: ticketId,
        p_admin_id: adminId,
        p_resolution_notes: resolutionNotes,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast.success('Ticket resolved successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'ticket-stats'] });
    },
    onError: (error) => {
      logger.error('Failed to resolve ticket:', error);
      toast.error('Failed to resolve ticket');
    },
  });
}

/**
 * Update ticket status mutation
 */
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      status,
    }: {
      ticketId: string;
      status: 'pending' | 'in_progress' | 'resolved' | 'closed';
    }) => {
      logger.log('Admin: Updating ticket status', { ticketId, status });

      const { error } = await supabase
        .from('contact_submissions')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Ticket status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    },
    onError: (error) => {
      logger.error('Failed to update ticket status:', error);
      toast.error('Failed to update status');
    },
  });
}

/**
 * Update ticket priority mutation
 */
export function useUpdateTicketPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      priority,
    }: {
      ticketId: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
    }) => {
      logger.log('Admin: Updating ticket priority', { ticketId, priority });

      // Recalculate SLA when priority changes
      const { data: slaData } = await supabase.rpc(
        'calculate_sla_due_time',
        { priority_level: priority }
      );

      const { error } = await supabase
        .from('contact_submissions')
        .update({
          priority,
          sla_due_at: slaData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Ticket priority updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'tickets'] });
    },
    onError: (error) => {
      logger.error('Failed to update ticket priority:', error);
      toast.error('Failed to update priority');
    },
  });
}
