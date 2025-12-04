/**
 * usePartnerData Hook - OPTIMIZED VERSION
 * Consolidates all partner-related data fetching with React Query
 * Eliminates the 36+ useState hooks in PartnerDashboard
 */
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import {
  getPartnerByUserId,
  getPartnerOffers,
  getPartnerReservations,
  getPartnerStats,
  getPartnerPoints,
  type PartnerPoints,
} from '@/lib/api';
import { usePartnersStore } from '@/stores';
import type { Partner, Offer, Reservation } from '@/lib/types';

interface PartnerDataResult {
  partner: Partner | null;
  offers: Offer[];
  reservations: Reservation[];
  stats: {
    activeOffers: number;
    reservationsToday: number;
    itemsPickedUp: number;
  } | null;
  points: PartnerPoints | null;
  isLoading: boolean;
  error: Error | null;
  refetchAll: () => void;
}

/**
 * Main hook for partner dashboard data
 * Replaces 36+ individual useState hooks with React Query + Zustand
 */
export function usePartnerData(userId: string): PartnerDataResult {
  const setCurrentPartner = usePartnersStore((state) => state.setCurrentPartner);
  const setPartnerPoints = usePartnersStore((state) => state.setPartnerPoints);

  // Fetch partner profile
  const {
    data: partner = null,
    isLoading: partnerLoading,
    error: partnerError,
    refetch: refetchPartner,
  } = useQuery({
    queryKey: queryKeys.partners.detail(userId),
    queryFn: async () => {
      const data = await getPartnerByUserId(userId);
      setCurrentPartner(data);
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch partner offers
  const {
    data: offers = [],
    isLoading: offersLoading,
    refetch: refetchOffers,
  } = useQuery({
    queryKey: queryKeys.offers.byPartner(partner?.id || ''),
    queryFn: () => getPartnerOffers(partner!.id),
    enabled: !!partner?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch partner reservations
  const {
    data: reservations = [],
    isLoading: reservationsLoading,
    refetch: refetchReservations,
  } = useQuery({
    queryKey: queryKeys.reservations.byPartner(partner?.id || ''),
    queryFn: () => getPartnerReservations(partner!.id),
    enabled: !!partner?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Fetch partner stats
  const {
    data: stats = null,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: [...queryKeys.partners.detail(userId), 'stats'],
    queryFn: () => getPartnerStats(partner!.id),
    enabled: !!partner?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch partner points
  const {
    data: points = null,
    isLoading: pointsLoading,
    refetch: refetchPoints,
  } = useQuery({
    queryKey: queryKeys.partners.points(userId),
    queryFn: async () => {
      const data = await getPartnerPoints(userId);
      setPartnerPoints(data);
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isLoading =
    partnerLoading ||
    offersLoading ||
    reservationsLoading ||
    statsLoading ||
    pointsLoading;

  const refetchAll = () => {
    refetchPartner();
    refetchOffers();
    refetchReservations();
    refetchPoints();
  };

  return {
    partner,
    offers,
    reservations,
    stats,
    points,
    isLoading,
    error: partnerError as Error | null,
    refetchAll,
  };
}

/**
 * Lightweight hook for just partner points
 * Use when you only need points data (e.g., for slot purchasing)
 */
export function usePartnerPoints(userId: string) {
  const setPartnerPoints = usePartnersStore((state) => state.setPartnerPoints);

  return useQuery({
    queryKey: queryKeys.partners.points(userId),
    queryFn: async () => {
      const data = await getPartnerPoints(userId);
      setPartnerPoints(data);
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
