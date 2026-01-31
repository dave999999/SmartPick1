/**
 * usePickupBroadcast - Lightweight pickup confirmation listener
 * 
 * Listens for broadcast messages when partner confirms pickup.
 * Active whenever customer has an active reservation - ensures
 * success dialog shows whether partner scans QR, enters code manually,
 * or uses partner dashboard button.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface UsePickupBroadcastProps {
  reservationId: string | null;
  enabled: boolean;
  onPickupConfirmed: (data: { savedAmount: number; pointsEarned: number }) => void;
}

export function usePickupBroadcast({ 
  reservationId, 
  enabled,
  onPickupConfirmed 
}: UsePickupBroadcastProps) {
  // Use ref to avoid effect dependency loop
  const callbackRef = useRef(onPickupConfirmed);
  
  // Update ref when callback changes (but don't trigger effect)
  useEffect(() => {
    callbackRef.current = onPickupConfirmed;
  }, [onPickupConfirmed]);

  useEffect(() => {
    if (!reservationId || !enabled) {
      return;
    }

    logger.debug('[usePickupBroadcast] Listening for pickup confirmation on:', reservationId);
    
    // Join broadcast channel for this specific reservation
    const channel = supabase
      .channel(`pickup-${reservationId}`)
      .on('broadcast', { event: 'pickup_confirmed' }, async (payload) => {
        logger.debug('[usePickupBroadcast] Pickup broadcast received');

        const broadcastSaved = Number(payload?.payload?.savedAmount ?? 0);
        let savedAmount = Number.isFinite(broadcastSaved) ? broadcastSaved : 0;

        // If broadcaster couldn't compute savings (common when only status was updated), compute it here.
        if (savedAmount <= 0) {
          try {
            const { data: resData, error: resError } = await supabase
              .from('reservations')
              .select('id, quantity, total_price, offer:offers(original_price, smart_price)')
              .eq('id', reservationId)
              .maybeSingle();

            if (resError) {
              logger.warn('[usePickupBroadcast] Failed to fetch reservation for savings calc:', resError);
            }

            const quantity = Number((resData as any)?.quantity ?? 1);
            const originalPrice = Number((resData as any)?.offer?.original_price ?? NaN);
            const smartPrice = Number((resData as any)?.offer?.smart_price ?? NaN);

            if (Number.isFinite(originalPrice) && Number.isFinite(smartPrice)) {
              savedAmount = Math.max(0, (originalPrice - smartPrice) * (Number.isFinite(quantity) ? quantity : 1));
            } else {
              // Last-resort fallback: try original_total (if possible) minus total paid
              const totalPaid = Number((resData as any)?.total_price ?? 0);
              const rawSaved = Number.isFinite(originalPrice)
                ? (originalPrice * (Number.isFinite(quantity) ? quantity : 1)) - totalPaid
                : 0;
              savedAmount = Number.isFinite(rawSaved) ? Math.max(0, rawSaved) : 0;
            }
          } catch (e) {
            logger.warn('[usePickupBroadcast] Savings calc fallback failed:', e);
          }
        }

        const pointsEarned = Math.floor(savedAmount * 10); // 10 points per GEL

        logger.log('[usePickupBroadcast] Pickup confirmed via broadcast!');
        logger.debug('[usePickupBroadcast] Final celebration data:', { savedAmount, pointsEarned, broadcastSaved });
        callbackRef.current({ savedAmount, pointsEarned });
      })
      .subscribe((status) => {
        logger.debug('[usePickupBroadcast] Broadcast channel status:', status);
      });

    // Cleanup when modal closes or component unmounts
    return () => {
      logger.debug('[usePickupBroadcast] Unsubscribing from pickup broadcast');
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [reservationId, enabled]); // Removed onPickupConfirmed from dependencies
}
