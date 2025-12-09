/**
 * useOffers.ts
 * Hook for fetching and managing offers with real-time updates
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Offer } from '@/lib/types';

export function useOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchOffers();

    // ⚠️ DISABLED: Real-time subscription for ALL offers causes 23K+ queries
    // This was a performance issue - every offer update triggered a refetch
    // Solution: Use polling/refetch instead, or filter by user's viewport
    
    /* REMOVED REALTIME SUBSCRIPTION:
    const channel = supabase
      .channel('offers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'offers',
        },
        async (payload) => {
          console.log('🔔 Offer changed:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            // New offer added - fetch full details with partner data
            const newOfferId = payload.new.id;
            const { data: newOffer } = await supabase
              .from('offers')
              .select(`
                *,
                partner:partners(*)
              `)
              .eq('id', newOfferId)
              .eq('status', 'ACTIVE')
              .gt('quantity_available', 0)
              .gt('expires_at', new Date().toISOString())
              .single();

            if (newOffer) {
              const offerWithLocation = {
                ...newOffer,
                partner: newOffer.partner ? {
                  ...newOffer.partner,
                  location: {
                    latitude: newOffer.partner.latitude,
                    longitude: newOffer.partner.longitude
                  }
                } : null
              };
              
              setOffers(prev => [offerWithLocation, ...prev]);
              console.log('✅ New offer added to list:', offerWithLocation.title);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Offer updated - update in list or remove if no longer active
            const updatedOffer = payload.new as any;
            
            if (
              updatedOffer.status === 'ACTIVE' &&
              updatedOffer.quantity_available > 0 &&
              new Date(updatedOffer.expires_at) > new Date()
            ) {
              // Fetch full details with partner data
              const { data: fullOffer } = await supabase
                .from('offers')
                .select(`
                  *,
                  partner:partners(*)
                `)
                .eq('id', updatedOffer.id)
                .single();

              if (fullOffer) {
                const offerWithLocation = {
                  ...fullOffer,
                  partner: fullOffer.partner ? {
                    ...fullOffer.partner,
                    location: {
                      latitude: fullOffer.partner.latitude,
                      longitude: fullOffer.partner.longitude
                    }
                  } : null
                };

                setOffers(prev => {
                  const index = prev.findIndex(o => o.id === updatedOffer.id);
                  if (index !== -1) {
                    const updated = [...prev];
                    updated[index] = offerWithLocation;
                    return updated;
                  }
                  return prev;
                });
                console.log('✅ Offer updated:', offerWithLocation.title);
              }
            } else {
              // Offer is no longer active, remove it
              setOffers(prev => prev.filter(o => o.id !== updatedOffer.id));
              console.log('❌ Offer removed (inactive):', updatedOffer.id);
            }
          } else if (payload.eventType === 'DELETE') {
            // Offer deleted - remove from list
            setOffers(prev => prev.filter(o => o.id !== payload.old.id));
            console.log('❌ Offer deleted:', payload.old.id);
          }
        }
      )
      .subscribe();
    */

    // Cleanup function - no subscription to clean up anymore
    return () => {
      // channel.unsubscribe(); // Disabled
    };
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('offers')
        .select(`
          *,
          partner:partners(*)
        `)
        .eq('status', 'ACTIVE')
        .gt('quantity_available', 0)
        .gt('expires_at', new Date().toISOString()) // Filter out expired offers
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ Supabase error:', fetchError);
        throw fetchError;
      }
      
      // Transform flat lat/lng to location object for compatibility
      const offersWithLocation = data?.map(offer => ({
        ...offer,
        partner: offer.partner ? {
          ...offer.partner,
          location: {
            latitude: offer.partner.latitude,
            longitude: offer.partner.longitude
          }
        } : null
      }));
      
      console.log('📦 Loaded offers with partner data:', offersWithLocation?.length, 'offers');
      console.log('🔍 Sample offer:', offersWithLocation?.[0]);
      
      setOffers(offersWithLocation || []);
    } catch (err) {
      console.error('❌ Error fetching offers:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { offers, loading, error, refetch: fetchOffers };
}
