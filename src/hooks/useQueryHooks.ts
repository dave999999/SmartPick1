/**
 * Custom React Query Hooks
 * Optimized data fetching with automatic caching and deduplication
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { 
  getCurrentUser, 
  getActiveOffers, 
  getCustomerReservations,
  createReservation as apiCreateReservation,
  cancelReservation as apiCancelReservation,
} from '@/lib/api';
import { useUserStore, useOffersStore, useReservationsStore } from '@/stores';
import type { Reservation } from '@/lib/types';

/**
 * Hook: Fetch current user with automatic store sync
 */
export function useCurrentUser() {
  const setUser = useUserStore((state) => state.setUser);
  const setLoading = useUserStore((state) => state.setLoading);

  return useQuery({
    queryKey: queryKeys.user.current(),
    queryFn: async () => {
      setLoading(true);
      const { user, error } = await getCurrentUser();
      if (error) throw error;
      setUser(user);
      return user;
    },
    staleTime: 10 * 60 * 1000, // User data fresh for 10 minutes
  });
}

/**
 * Hook: Fetch offers with automatic store sync
 */
export function useOffers(filters?: Record<string, unknown>) {
  const setOffers = useOffersStore((state) => state.setOffers);
  const setLoading = useOffersStore((state) => state.setLoading);

  return useQuery({
    queryKey: queryKeys.offers.list(filters),
    queryFn: async () => {
      setLoading(true);
      const offers = await getActiveOffers();
      setOffers(offers);
      return offers;
    },
    staleTime: 2 * 60 * 1000, // Offers fresh for 2 minutes
  });
}

/**
 * Hook: Fetch user reservations with automatic store sync
 */
export function useReservations(userId: string) {
  const setReservations = useReservationsStore((state) => state.setReservations);
  const setLoading = useReservationsStore((state) => state.setLoading);

  return useQuery({
    queryKey: queryKeys.reservations.list(userId),
    queryFn: async () => {
      setLoading(true);
      const reservations = await getCustomerReservations(userId);
      setReservations(reservations);
      return reservations;
    },
    enabled: !!userId, // Only fetch if userId exists
    staleTime: 1 * 60 * 1000, // Reservations fresh for 1 minute
  });
}

/**
 * Hook: Create reservation with optimistic updates
 */
export function useCreateReservation() {
  const queryClient = useQueryClient();
  const addReservation = useReservationsStore((state) => state.addReservation);

  return useMutation({
    mutationFn: async ({
      offerId,
      customerId,
      quantity,
    }: {
      offerId: string;
      customerId: string;
      quantity: number;
    }) => {
      return await apiCreateReservation(offerId, customerId, quantity);
    },
    
    // Optimistic update: Add reservation immediately
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.reservations.list(variables.customerId),
      });

      // Snapshot previous value
      const previousReservations = queryClient.getQueryData(
        queryKeys.reservations.list(variables.customerId)
      );

      // Optimistically update cache (optional - we'll refetch on success anyway)
      return { previousReservations };
    },

    // On success: Sync with server data
    onSuccess: (data, variables) => {
      addReservation(data as Reservation);
      
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.list(variables.customerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.offers.all,
      });
    },

    // On error: Rollback optimistic update
    onError: (err, variables, context) => {
      if (context?.previousReservations) {
        queryClient.setQueryData(
          queryKeys.reservations.list(variables.customerId),
          context.previousReservations
        );
      }
    },
  });
}

/**
 * Hook: Cancel reservation with optimistic updates
 */
export function useCancelReservation() {
  const queryClient = useQueryClient();
  const updateReservation = useReservationsStore((state) => state.updateReservation);

  return useMutation({
    mutationFn: async ({ reservationId }: { reservationId: string }) => {
      return await apiCancelReservation(reservationId);
    },

    onSuccess: (data, variables) => {
      updateReservation(variables.reservationId, { status: 'CANCELLED' });
      
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservations.all,
      });
    },
  });
}
