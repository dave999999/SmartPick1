/**
 * useReservationFlow - Active reservation lifecycle management
 * 
 * Manages active reservations, real-time updates, pickup celebrations, and GPS tracking.
 * Handles the complete post-reservation experience including navigation and status updates.
 * Extracted from IndexRedesigned.tsx to isolate reservation flow logic.
 */

import { useState, useEffect } from 'react';
import { User, Reservation } from '@/lib/types';
import { useLiveGPS } from '@/hooks/useLiveGPS';
import { logger } from '@/lib/logger';

interface UseReservationFlowProps {
  user: User | null;
  isPostResNavigating: boolean;
}

export interface ReservationFlowState {
  activeReservationId: string | null;
  activeReservation: Reservation | null;
  isReservationLoading: boolean;
  showPickupSuccessModal: boolean;
  pickupModalData: { 
    savedAmount: number; 
    pointsEarned: number;
    offerTitle?: string;
    offerImage?: string;
    originalPrice?: number;
    paidPrice?: number;
    quantity?: number;
  } | null;
  gpsPosition: GeolocationPosition | null;
  setActiveReservationId: (id: string | null) => void;
  setActiveReservation: (reservation: Reservation | null) => void;
  setIsReservationLoading: (loading: boolean) => void;
  setShowPickupSuccessModal: (show: boolean) => void;
  setPickupModalData: (data: { 
    savedAmount: number; 
    pointsEarned: number;
    offerTitle?: string;
    offerImage?: string;
    originalPrice?: number;
    paidPrice?: number;
    quantity?: number;
  } | null) => void;
  loadActiveReservation: () => Promise<void>;
}

export function useReservationFlow({ user, isPostResNavigating }: UseReservationFlowProps): ReservationFlowState {
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [isReservationLoading, setIsReservationLoading] = useState(true);
  const [showPickupSuccessModal, setShowPickupSuccessModal] = useState(false);
  const [pickupModalData, setPickupModalData] = useState<{ 
    savedAmount: number; 
    pointsEarned: number;
    offerTitle?: string;
    offerImage?: string;
    originalPrice?: number;
    paidPrice?: number;
    quantity?: number;
  } | null>(null);

  // Enable GPS tracking when navigating
  const { position: gpsPosition } = useLiveGPS({ 
    enabled: isPostResNavigating,
    updateInterval: 3000 
  });

  // Load active reservation from API
  const loadActiveReservation = async () => {
    if (!user?.id) {
      setIsReservationLoading(false);
      return;
    }
    
    setIsReservationLoading(true);
    try {
      const { getCustomerReservations } = await import('@/lib/api/reservations');
      const reservations = await getCustomerReservations(user.id);
      
      // Check if current active reservation was picked up
      if (activeReservation) {
        const currentRes = reservations.find(r => r.id === activeReservation.id);
        if (currentRes && currentRes.status === 'PICKED_UP') {
          logger.log('✅ Order picked up detected via polling!');
          logger.debug('🎉 PICKUP DETECTED (POLLING) - Status changed to PICKED_UP', currentRes);
          
          // Check localStorage to prevent duplicate celebrations
          const celebrationKey = `pickup-celebrated-${activeReservation.id}`;
          const alreadyCelebrated = localStorage.getItem(celebrationKey);
          logger.debug('🔍 Celebration check (polling):', { celebrationKey, alreadyCelebrated });
          
          if (!alreadyCelebrated) {
            localStorage.setItem(celebrationKey, 'true');

            // Calculate actual savings.
            // `Reservation.offer` is not always hydrated by the API response, so fall back to fetching offer prices.
            const quantity = activeReservation.quantity || 1;
            const hydratedOriginal = (activeReservation.offer as any)?.original_price ?? (currentRes.offer as any)?.original_price;
            const hydratedSmart = (activeReservation.offer as any)?.smart_price ?? (currentRes.offer as any)?.smart_price;

            let originalPrice = Number(hydratedOriginal ?? NaN);
            let smartPrice = Number(hydratedSmart ?? NaN);

            if (!Number.isFinite(originalPrice) || !Number.isFinite(smartPrice)) {
              try {
                const { supabase } = await import('@/lib/supabase');
                const offerId = (activeReservation as any).offer_id ?? (activeReservation.offer as any)?.id;

                if (offerId) {
                  const { data: offerData } = await supabase
                    .from('offers')
                    .select('original_price, smart_price, title, image_url')
                    .eq('id', offerId)
                    .maybeSingle();

                  originalPrice = Number((offerData as any)?.original_price ?? originalPrice);
                  smartPrice = Number((offerData as any)?.smart_price ?? smartPrice);
                }
              } catch (e) {
                logger.debug('⚠️ Failed to fetch offer prices for savings calc (polling)', e);
              }
            }

            let savedAmount = 0;
            if (Number.isFinite(originalPrice) && Number.isFinite(smartPrice)) {
              savedAmount = Math.max(0, (originalPrice - smartPrice) * quantity);
            } else {
              const totalPaid = Number(activeReservation.total_price ?? 0);
              const originalTotal = Number.isFinite(originalPrice) ? originalPrice * quantity : 0;
              const rawSaved = originalTotal - totalPaid;
              savedAmount = Number.isFinite(rawSaved) ? Math.max(0, rawSaved) : 0;
            }

            const pointsEarned = Math.floor(savedAmount * 10); // 10 points per GEL
            
            // Extract offer details for modal
            const offerTitle = (activeReservation.offer as any)?.title || (currentRes.offer as any)?.title;
            const offerImage = (activeReservation.offer as any)?.image_url || (currentRes.offer as any)?.image_url;
            const paidPrice = Number(activeReservation.total_price ?? smartPrice * quantity);
            
            logger.debug('💰 Celebration data (polling):', { 
              savedAmount, 
              pointsEarned,
              offerTitle,
              offerImage,
              originalPrice,
              paidPrice,
              quantity
            });
            
            // Show pickup success modal with enhanced details
            setPickupModalData({ 
              savedAmount, 
              pointsEarned,
              offerTitle,
              offerImage,
              originalPrice: Number.isFinite(originalPrice) ? originalPrice : undefined,
              paidPrice: Number.isFinite(paidPrice) ? paidPrice : undefined,
              quantity
            });
            setShowPickupSuccessModal(true);
            logger.debug('✅ Modal state updated (polling) - should show now');
            
            // Clear active reservation
            setActiveReservation(null);
          } else {
            // Just clear if already celebrated
            logger.debug('⚠️ Pickup already celebrated (polling), skipping modal');
            setActiveReservation(null);
          }
          return;
        }
      }
      
      // Find the first ACTIVE reservation
      const activeRes = reservations.find(r => r.status === 'ACTIVE');
      
      if (activeRes) {
        // Only update if it's a new reservation or status changed
        if (!activeReservation || activeReservation.id !== activeRes.id) {
          setActiveReservation(activeRes);
          logger.log('✅ Active reservation state updated');
        }
      } else {
        // Clear if no active reservation found
        if (activeReservation) {
          setActiveReservation(null);
          logger.log('No active reservation found');
        }
      }
    } catch (error) {
      logger.error('Failed to load active reservation:', error);
    } finally {
      setIsReservationLoading(false);
    }
  };

  // Load active reservation when user is detected
  useEffect(() => {
    if (user?.id) {
      loadActiveReservation();
      
      // Clean up old celebration keys (older than 24 hours) to prevent localStorage bloat
      const cleanupOldCelebrations = () => {
        const keys = Object.keys(localStorage);
        const celebrationKeys = keys.filter(k => k.startsWith('pickup-celebrated-'));
        logger.log(`🧹 Found ${celebrationKeys.length} celebration keys in localStorage`);
        
        // Keep only the last 5 celebration keys, remove the rest
        if (celebrationKeys.length > 5) {
          const keysToRemove = celebrationKeys.slice(0, celebrationKeys.length - 5);
          keysToRemove.forEach(key => localStorage.removeItem(key));
          logger.log(`🧹 Cleaned up ${keysToRemove.length} old celebration keys`);
        }
      };
      
      cleanupOldCelebrations();
    } else {
      setActiveReservation(null);
      setIsReservationLoading(false); // No user = no reservation to load
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // 🔧 FIX: Only depend on user.id, not entire user object

  // ✅ OPTIMIZED: No real-time subscription needed for active reservation tracker
  // Pickup confirmation is handled by usePickupBroadcast in ActiveReservationCard when QR is shown
  // This saves 20-30 WebSocket connections (limited to 200 total)
  // Status refreshes automatically when user opens the reservation widget
  // Supabase API calls are unlimited, WebSocket connections are not

  return {
    activeReservationId,
    activeReservation,
    isReservationLoading,
    showPickupSuccessModal,
    pickupModalData,
    gpsPosition,
    setActiveReservationId,
    setActiveReservation,
    setIsReservationLoading,
    setShowPickupSuccessModal,
    setPickupModalData,
    loadActiveReservation,
  };
}
