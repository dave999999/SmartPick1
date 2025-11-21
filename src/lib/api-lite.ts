// Minimal API surface for landing page to avoid pulling full api.ts & its transitive imports.
// Uses lazy supabase loader. Mirrors signatures of original functions used on Index.

import type { PostgrestError } from '@supabase/supabase-js';
import type { Offer, User } from './types';
import { getSupabase } from './supabase-lazy';

// Fetch active offers (simplified) - mirrors logic from api/offers.ts
export async function getActiveOffers(): Promise<Offer[]> {
  const supabase = await getSupabase();
  
  // Query for ACTIVE status, not expired, and has stock
  const { data: offers, error } = await supabase
    .from('offers')
    .select('*')
    .eq('status', 'ACTIVE')
    .gt('expires_at', new Date().toISOString())
    .gt('quantity_available', 0)
    .order('created_at', { ascending: false })
    .limit(500);
  
  if (error) {
    console.warn('[api-lite] getActiveOffers error', error);
    return [];
  }

  if (!offers || offers.length === 0) {
    return [];
  }

  // Fetch partners separately to avoid RLS issues
  const partnerIds = [...new Set(offers.map(o => o.partner_id).filter(Boolean))];
  
  if (partnerIds.length > 0) {
    const { data: partners } = await supabase
      .from('partners')
      .select('*')
      .in('id', partnerIds);

    if (partners) {
      const partnerMap = new Map(partners.map(p => [p.id, p]));
      offers.forEach(offer => {
        if (offer.partner_id) {
          offer.partner = partnerMap.get(offer.partner_id);
        }
      });
    }
  }

  return (offers as Offer[]) || [];
}

export async function getCurrentUser(): Promise<{ user: User | null; error: PostgrestError | null }> {
  const supabase = await getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user: user as any as User | null, error };
}
