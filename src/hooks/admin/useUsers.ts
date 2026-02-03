/**
 * useUsers Hook
 * Fetch and manage user data with filters, pagination, sorting
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface UserFilters {
  status?: 'ACTIVE' | 'DISABLED' | 'BANNED';
  role?: string;
  search?: string;
  hasNoPenalty?: boolean;
  hasPenalty?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'created_at' | 'penalty_count';
  sortOrder?: 'asc' | 'desc';
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  penalty_until?: string;
  penalty_count: number;
  penalty_warning_shown: boolean;
  max_reservation_quantity: number;
  purchased_slots?: any;
  referral_code: string;
  referred_by?: string;
  is_email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  points_balance?: number;
  total_reservations?: number;
  no_show_rate?: number;
  risk_score?: number;
}

export interface UserStats {
  total_reservations: number;
  successful_pickups: number;
  no_shows: number;
  cancelled: number;
  points_balance: number;
  total_money_saved: number;
  current_streak_days: number;
}

/**
 * Fetch users with filters and pagination
 */
export function useUsers(filters: UserFilters = {}) {
  const { page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: ['admin', 'users', filters],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select(`
          *,
          user_points!inner(balance)
        `, { count: 'exact' });

      // IMPORTANT: Only show regular users (customers), NOT partners or admins
      query = query.neq('role', 'partner');
      query = query.neq('role', 'ADMIN');

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      if (filters.role) {
        query = query.eq('role', filters.role);
      }

      if (filters.hasPenalty) {
        query = query.gt('penalty_count', 0);
      }

      if (filters.hasNoPenalty) {
        query = query.eq('penalty_count', 0);
      }

      // Sorting
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch users', { error });
        throw error;
      }

      // Map user_points.balance to points_balance for UI consistency
      const users: UserData[] = (data || []).map((user: any) => ({
        ...user,
        points_balance: user.user_points?.balance || 0,
      }));

      return {
        users,
        total: count || 0,
        page,
        pages: Math.ceil((count || 0) / limit),
      };
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch single user details with full stats
 */
export function useUser(userId: string | null) {
  return useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('users')
        .select(`
          *
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Fetch user's reservations for statistics
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, status, picked_up_at, no_show')
        .eq('customer_id', userId);

      return {
        ...data,
        points_balance: data.points_balance || 0,
        total_reservations: reservations?.length || 0,
        successful_pickups: reservations?.filter(r => r.picked_up_at).length || 0,
        no_shows: reservations?.filter(r => r.no_show).length || 0
      };
    },
    enabled: !!userId,
  });
}

// Fetch user statistics
export function useUserStats(userId: string | null) {
  return useQuery({
    queryKey: ['admin', 'user-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('users')
        .select(`
          *
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Fetch user's recent reservations
 */
export function useUserReservations(userId: string | null, limit = 20) {
  return useQuery({
    queryKey: ['admin', 'user', userId, 'reservations'],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          offers(title, original_price, smart_price),
          partners(business_name)
        `)
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

/**
 * Fetch user's point transaction history
 */
export function useUserPointTransactions(userId: string | null, limit = 20) {
  return useQuery({
    queryKey: ['admin', 'user', userId, 'point-transactions'],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

/**
 * Ban user mutation
 */
export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      reason,
      duration,
      notifyUser = true,
    }: {
      userId: string;
      reason: string;
      duration: 'warning' | '1hour' | '24hour' | 'permanent';
      notifyUser?: boolean;
    }) => {
      logger.log('Admin: Banning user', { userId, reason, duration });

      // Calculate suspension end time
      let suspendedUntil: string | null = null;
      const now = new Date();

      switch (duration) {
        case '1hour':
          suspendedUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
          break;
        case '24hour':
          suspendedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'permanent':
          suspendedUntil = new Date('2099-12-31').toISOString();
          break;
      }

      // Update user penalty
      const { error: penaltyError } = await supabase.from('user_penalties').insert({
        user_id: userId,
        offense_type: 'admin_action',
        penalty_type: duration,
        suspended_until: suspendedUntil,
        is_active: true,
        admin_notes: reason,
      });

      if (penaltyError) throw penaltyError;

      // Update user record
      const { error: userError } = await supabase
        .from('users')
        .update({
          penalty_until: suspendedUntil,
          penalty_count: supabase.rpc('increment_penalty_count', { user_id: userId }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (userError) throw userError;

      // TODO: Send notification to user if notifyUser is true

      return { success: true };
    },
    onSuccess: () => {
      toast.success('User banned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      logger.error('Failed to ban user:', error);
      toast.error('Failed to ban user');
    },
  });
}

/**
 * Unban user mutation
 */
export function useUnbanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      logger.log('Admin: Unbanning user', { userId, reason });

      // Deactivate all active penalties
      const { error: penaltyError } = await supabase
        .from('user_penalties')
        .update({ is_active: false, admin_notes: reason })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (penaltyError) throw penaltyError;

      // Update user record
      const { error: userError } = await supabase
        .from('users')
        .update({
          penalty_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (userError) throw userError;

      return { success: true };
    },
    onSuccess: () => {
      toast.success('User unbanned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      logger.error('Failed to unban user:', error);
      toast.error('Failed to unban user');
    },
  });
}

/**
 * Add/Remove points mutation
 */
export function useUpdateUserPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      amount,
      reason,
      notes,
    }: {
      userId: string;
      amount: number;
      reason: string;
      notes?: string;
    }) => {
      logger.log('Admin: Updating user points', { userId, amount, reason });

      // Call RPC function to update points
      const { data, error } = await supabase.rpc(
        amount > 0 ? 'add_user_points' : 'deduct_user_points',
        {
          p_user_id: userId,
          p_amount: Math.abs(amount),
          p_reason: reason,
          p_metadata: { admin_action: true, notes },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Points updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'user'] });
    },
    onError: (error) => {
      logger.error('Failed to update points:', error);
      toast.error('Failed to update points');
    },
  });
}

/**
 * Update user details mutation
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<UserData>;
    }) => {
      logger.log('Admin: Updating user', { userId, updates });

      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      logger.error('Failed to update user:', error);
      toast.error('Failed to update user');
    },
  });
}

/**
 * Delete user mutation (GDPR)
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      logger.log('Admin: Deleting user (GDPR)', { userId, reason });

      // Call RPC function that scrubs PII
      const { error } = await supabase.rpc('admin_delete_user', {
        p_user_id: userId,
        p_reason: reason,
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      logger.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    },
  });
}

/**
 * Grant or deduct points from a user
 */
export function useAdjustPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      amount, 
      reason 
    }: { 
      userId: string; 
      amount: number; // Positive to grant, negative to deduct
      reason: string;
    }) => {
      // Get current balance from user_points table (NOT users table!)
      const { data: pointsData, error: fetchError } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        logger.error('Failed to fetch user points', { userId, error: fetchError });
        throw new Error('Could not fetch user points. Make sure user has a user_points entry.');
      }

      const currentBalance = pointsData?.balance || 0;
      const newBalance = currentBalance + amount;

      if (newBalance < 0) {
        throw new Error(`Cannot deduct ${Math.abs(amount)} points. User only has ${currentBalance} points.`);
      }

      // Update balance in user_points table
      const { error: updateError } = await supabase
        .from('user_points')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        logger.error('Failed to update user points', { userId, error: updateError });
        throw new Error('Could not update points');
      }

      // Log transaction in point_transactions table
      await supabase
        .from('point_transactions')
        .insert({
          user_id: userId,
          change: amount,
          reason: reason || 'admin_adjustment',
          balance_before: currentBalance,
          balance_after: newBalance,
          metadata: { adjusted_by: 'admin', timestamp: new Date().toISOString() }
        });

      logger.info('Admin adjusted user points', {
        userId,
        amount,
        oldBalance: currentBalance,
        newBalance,
        reason,
      });

      return { success: true, newBalance, oldBalance: currentBalance };
    },
    onSuccess: (data, variables) => {
      const action = variables.amount > 0 ? 'granted' : 'deducted';
      toast.success(`Successfully ${action} ${Math.abs(variables.amount)} points`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', variables.userId] });
    },
    onError: (error: any) => {
      logger.error('Failed to adjust points:', error);
      toast.error(error.message || 'Failed to adjust points');
    },
  });
}
