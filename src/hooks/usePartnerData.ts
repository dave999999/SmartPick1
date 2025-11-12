import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Partner, Offer, Reservation, PartnerPoints } from '@/lib/types';
import {
  getPartnerByUserId,
  getPartnerOffers,
  getPartnerReservations,
  getPartnerStats,
  getCurrentUser,
  getPartnerPoints,
} from '@/lib/api';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';

interface PartnerStats {
  activeOffers: number;
  reservationsToday: number;
  itemsPickedUp: number;
}

interface PartnerAnalytics {
  totalOffers: number;
  totalReservations: number;
  itemsSold: number;
  revenue: number;
}

export function usePartnerData() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<PartnerStats>({
    activeOffers: 0,
    reservationsToday: 0,
    itemsPickedUp: 0
  });
  const [analytics, setAnalytics] = useState<PartnerAnalytics>({
    totalOffers: 0,
    totalReservations: 0,
    itemsSold: 0,
    revenue: 0
  });
  const [partnerPoints, setPartnerPoints] = useState<PartnerPoints | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPartnerData = async () => {
    try {
      setIsLoading(true);
      const { user } = await getCurrentUser();

      if (!user) {
        navigate('/');
        return;
      }

      const partnerData = await getPartnerByUserId(user.id);

      if (!partnerData) {
        toast.error(t('partner.dashboard.toast.partnerNotFound'));
        navigate('/partner/apply');
        return;
      }

      setPartner(partnerData);

      // Normalize status to uppercase for comparison
      const normalizedStatus = partnerData.status?.toUpperCase();

      // If partner is pending, only load basic data
      if (normalizedStatus === 'PENDING') {
        setIsLoading(false);
        return;
      }

      // If approved, load full dashboard data
      if (normalizedStatus === 'APPROVED') {
        const [offersData, reservationsData, statsData, pointsData] = await Promise.all([
          getPartnerOffers(partnerData.id),
          getPartnerReservations(partnerData.id),
          getPartnerStats(partnerData.id),
          getPartnerPoints(user.id),
        ]);

        setOffers(offersData);
        setReservations(reservationsData.filter(r => r.status === 'ACTIVE'));
        setAllReservations(reservationsData);
        setStats(statsData);
        setPartnerPoints(pointsData);

        // Calculate analytics
        const totalReservations = reservationsData.length;
        const itemsSold = reservationsData
          .filter(r => r.status === 'PICKED_UP')
          .reduce((sum, r) => sum + r.quantity, 0);
        const revenue = reservationsData
          .filter(r => r.status === 'PICKED_UP')
          .reduce((sum, r) => sum + r.total_price, 0);

        setAnalytics({
          totalOffers: offersData.length,
          totalReservations,
          itemsSold,
          revenue
        });
      } else {
        // Status is REJECTED or other
        toast.error(t('partner.dashboard.toast.applicationRejected'));
        navigate('/');
        return;
      }
    } catch (error) {
      logger.error('Error loading partner data:', error);
      toast.error(t('partner.dashboard.toast.loadFail'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPartnerData();
  }, []);

  return {
    partner,
    offers,
    reservations,
    allReservations,
    stats,
    analytics,
    partnerPoints,
    isLoading,
    loadPartnerData,
  };
}
