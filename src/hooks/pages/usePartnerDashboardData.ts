import { logger } from '@/lib/logger';
/**
 * usePartnerDashboardData - Partner data, offers, reservations state management
 * 
 * Manages loading and state for partner dashboard data including:
 * - Partner profile
 * - Active offers list
 * - Active reservations
 * - Dashboard statistics
 * - Partner points balance
 * 
 * Extracted from PartnerDashboardV3.tsx to isolate data fetching logic.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Partner, Offer, Reservation, PartnerStats, PartnerPoints } from '@/lib/types';
import { getCurrentUser } from '@/lib/api/auth';
import { getPartnerByUserId } from '@/lib/api/partners';
import { toast } from 'sonner';

export interface PartnerDashboardData {
  partner: Partner | null;
  offers: Offer[];
  reservations: Reservation[];
  stats: PartnerStats;
  partnerPoints: PartnerPoints | null;
  isLoading: boolean;
  loadPartnerData: () => Promise<void>;
  refreshReservations: () => Promise<void>;
  setOffers: React.Dispatch<React.SetStateAction<Offer[]>>;
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
}

export function usePartnerDashboardData(): PartnerDashboardData {
  const navigate = useNavigate();
  
  const [partner, setPartner] = useState<Partner | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<PartnerStats>({
    activeOffers: 0,
    totalOffers: 0,
    reservationsToday: 0,
    itemsPickedUp: 0,
    totalRevenue: 0
  });
  const [partnerPoints, setPartnerPoints] = useState<PartnerPoints | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load partner data from API
  const loadPartnerData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { user } = await getCurrentUser();
      if (!user) {
        navigate('/');
        return;
      }

      const partnerData = await getPartnerByUserId(user.id);
      if (!partnerData) {
        toast.error('Partner profile not found');
        navigate('/partner/apply');
        return;
      }

      setPartner(partnerData);

      // Load dashboard data
      const { getPartnerDashboardData } = await import('@/lib/api/partners');
      const dashboardData = await getPartnerDashboardData(user.id);

      setOffers(dashboardData.offers);
      setReservations(dashboardData.activeReservations);
      setStats(dashboardData.stats);
      setPartnerPoints(dashboardData.points);

    } catch (error) {
      logger.error('[usePartnerDashboardData] Error loading partner data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Load on mount
  useEffect(() => {
    loadPartnerData();
  }, [loadPartnerData]);

  // Refresh only reservations (lighter than full reload)
  const refreshReservations = useCallback(async () => {
    if (!partner?.id || !partner?.user_id) return;

    try {
      const { getPartnerDashboardData } = await import('@/lib/api/partners');
      const dashboardData = await getPartnerDashboardData(partner.user_id);
      
      setReservations(dashboardData.activeReservations);
      setStats(dashboardData.stats); // Update stats too (counts changed)
      
      logger.debug('[usePartnerDashboardData] Reservations refreshed via real-time update');
    } catch (error) {
      logger.error('[usePartnerDashboardData] Failed to refresh reservations:', error);
    }
  }, [partner?.id, partner?.user_id]);

  return {
    partner,
    offers,
    reservations,
    stats,
    partnerPoints,
    isLoading,
    loadPartnerData,
    refreshReservations,
    setOffers,
    setReservations,
  };
}
