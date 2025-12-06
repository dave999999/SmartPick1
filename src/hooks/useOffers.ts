/**
 * useOffers.ts
 * Hook for fetching and managing offers
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
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('offers')
        .select(`
          *,
          partner:partners(
            id,
            business_name,
            location,
            contact_number,
            address
          )
        `)
        .eq('status', 'ACTIVE')
        .gt('quantity_available', 0)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      console.log('📦 Loaded offers with partner data:', data?.length, 'offers');
      console.log('🔍 Sample offer:', data?.[0]);
      
      setOffers(data || []);
    } catch (err) {
      console.error('❌ Error fetching offers:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { offers, loading, error, refetch: fetchOffers };
}
