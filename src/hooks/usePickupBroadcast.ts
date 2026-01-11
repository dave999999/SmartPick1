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
      .on('broadcast', { event: 'pickup_confirmed' }, (payload) => {
        logger.debug('[usePickupBroadcast] Pickup broadcast received');
        
        const { savedAmount = 0 } = payload.payload || {};
        const pointsEarned = Math.floor(savedAmount * 10); // 10 points per GEL
        
        logger.log('[usePickupBroadcast] Pickup confirmed via broadcast!');
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
