/**
 * useReservationFlow - Active reservation lifecycle management
 * 
 * Manages active reservations, real-time updates, pickup celebrations, and GPS tracking.
 * Handles the complete post-reservation experience including navigation and status updates.
 * Extracted from IndexRedesigned.tsx to isolate reservation flow logic.
 */

import { useState, useEffect } from 'react';
import { User, Reservation } from '@/lib/types';
import { supabase } from '@/lib/supabase';
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
  pickupModalData: { savedAmount: number; pointsEarned: number } | null;
  gpsPosition: GeolocationPosition | null;
  setActiveReservationId: (id: string | null) => void;
  setActiveReservation: (reservation: Reservation | null) => void;
  setIsReservationLoading: (loading: boolean) => void;
  setShowPickupSuccessModal: (show: boolean) => void;
  setPickupModalData: (data: { savedAmount: number; pointsEarned: number } | null) => void;
  loadActiveReservation: () => Promise<void>;
}

export function useReservationFlow({ user, isPostResNavigating }: UseReservationFlowProps): ReservationFlowState {
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [isReservationLoading, setIsReservationLoading] = useState(true);
  const [showPickupSuccessModal, setShowPickupSuccessModal] = useState(false);
  const [pickupModalData, setPickupModalData] = useState<{ savedAmount: number; pointsEarned: number } | null>(null);

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
          console.log('🎉 PICKUP DETECTED (POLLING) - Status changed to PICKED_UP', currentRes);
          
          // Check localStorage to prevent duplicate celebrations
          const celebrationKey = `pickup-celebrated-${activeReservation.id}`;
          const alreadyCelebrated = localStorage.getItem(celebrationKey);
          console.log('🔍 Celebration check (polling):', { celebrationKey, alreadyCelebrated });
          
          if (!alreadyCelebrated) {
            localStorage.setItem(celebrationKey, 'true');
            
            // Calculate actual savings: (original price * quantity) - discounted price
            const originalTotal = (activeReservation.offer?.original_price || 0) * activeReservation.quantity;
            const discountedPrice = activeReservation.total_price || 0;
            const savedAmount = originalTotal - discountedPrice;
            const pointsEarned = Math.floor(savedAmount * 10); // 10 points per GEL
            
            console.log('💰 Celebration data (polling):', { savedAmount, pointsEarned });
            
            // Show pickup success modal
            setPickupModalData({ savedAmount, pointsEarned });
            setShowPickupSuccessModal(true);
            console.log('✅ Modal state updated (polling) - should show now');
            
            // Clear active reservation
            setActiveReservation(null);
          } else {
            // Just clear if already celebrated
            console.log('⚠️ Pickup already celebrated (polling), skipping modal');
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

  // Set up real-time subscription when active reservation exists
  useEffect(() => {
    if (!activeReservation?.id) {
      logger.log('🔌 No active reservation - skipping subscription setup');
      return;
    }

    logger.log('🔗 Setting up minimal subscription for reservation:', activeReservation.id);
    console.log('🔗 Setting up subscription for:', activeReservation.id);
    
    // ⚠️ REMOVED: Heavy polling (every 5 seconds) - now using broadcast instead
    // Pickup detection now happens via broadcast in ActiveReservationCard when QR modal is open
    
    let isCleanedUp = false;

    const channel = supabase
      .channel(`reservation-${activeReservation.id}`, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations',
          filter: `id=eq.${activeReservation.id}`
        },
        (payload) => {
          if (isCleanedUp) return; // Ignore events after cleanup
          
          logger.log('🔔 Real-time reservation update received:', payload);
          console.log('📨 Payload received:', payload.new);
          
          // Check if order was picked up
          if (payload.new && payload.new.status === 'PICKED_UP') {
            logger.log('✅ Order picked up detected via real-time!');
            console.log('🎉 PICKUP DETECTED - Status changed to PICKED_UP', payload.new);
            
            // Check localStorage to prevent duplicate celebrations
            const celebrationKey = `pickup-celebrated-${activeReservation.id}`;
            const alreadyCelebrated = localStorage.getItem(celebrationKey);
            console.log('🔍 Celebration check:', { celebrationKey, alreadyCelebrated });
            
            if (!alreadyCelebrated) {
              localStorage.setItem(celebrationKey, 'true');
              
              // Calculate actual savings: (original price * quantity) - discounted price
              const originalTotal = (activeReservation.offer?.original_price || 0) * activeReservation.quantity;
              const discountedPrice = activeReservation.total_price || 0;
              const savedAmount = originalTotal - discountedPrice;
              const pointsEarned = Math.floor(savedAmount * 10); // 10 points per GEL
              
              console.log('💰 Celebration data:', { savedAmount, pointsEarned });
              
              // Show pickup success modal
              setPickupModalData({ savedAmount, pointsEarned });
              setShowPickupSuccessModal(true);
              console.log('✅ Modal state updated - should show now');
              
              // Clear active reservation
              setActiveReservation(null);
            } else {
              console.log('⚠️ Pickup already celebrated, skipping modal');
            }
          } else {
            // Reload for other changes (but throttle this)
            if (!isCleanedUp) {
              loadActiveReservation();
            }
          }
        }
      )
      .subscribe((status) => {
        logger.log('📡 Subscription status:', status);
        console.log('📡 Subscription status:', status);
        
        // If subscription fails, force a reload to catch the pickup via polling
        if (status === 'SUBSCRIPTION_ERROR' || status === 'TIMED_OUT') {
          console.warn('⚠️ Subscription failed, relying on polling...');
          // Trigger immediate polling
          setTimeout(() => {
            if (!isCleanedUp) {
              loadActiveReservation();
            }
          }, 1000);
        }
      });

    return () => {
      isCleanedUp = true;
      logger.log('🔌 Cleaning up reservation subscription');
      console.log('🧹 Cleanup: removing subscription');
      
      // Remove the channel completely
      channel.unsubscribe().then(() => {
        supabase.removeChannel(channel);
        logger.log('✅ Channel removed from Supabase client');
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReservation?.id]);

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
