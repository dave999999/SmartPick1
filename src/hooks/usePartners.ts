/**
 * usePartners.ts
 * Hook for fetching and managing partners
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Partner } from '@/lib/types';

export function usePartners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('partners')
        .select('*')
        .eq('status', 'APPROVED');

      if (fetchError) throw fetchError;
      setPartners(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { partners, loading, error, refetch: fetchPartners };
}
