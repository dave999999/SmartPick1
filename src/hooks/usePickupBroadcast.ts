/**
 * usePickupBroadcast - Lightweight pickup confirmation listener
 * 
 * Listens for broadcast messages when partner confirms pickup.
 * Only active when QR modal is open - no polling, minimal resource usage.
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

    console.log('🎧 Listening for pickup confirmation on:', reservationId);
    
    // Join broadcast channel for this specific reservation
    const channel = supabase
      .channel(`pickup-${reservationId}`)
      .on('broadcast', { event: 'pickup_confirmed' }, (payload) => {
        console.log('📢 Pickup broadcast received:', payload);
        
        const { savedAmount = 0 } = payload.payload || {};
        const pointsEarned = Math.floor(savedAmount * 10); // 10 points per GEL
        
        logger.log('✅ Pickup confirmed via broadcast!');
        callbackRef.current({ savedAmount, pointsEarned });
      })
      .subscribe((status) => {
        console.log('🎧 Broadcast channel status:', status);
      });

    // Cleanup when modal closes or component unmounts
    return () => {
      console.log('🔌 Unsubscribing from pickup broadcast');
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [reservationId, enabled]); // Removed onPickupConfirmed from dependencies
}
