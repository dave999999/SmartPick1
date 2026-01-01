import { logger } from '@/lib/logger';
// Minimal API surface for landing page to avoid pulling full api.ts & its transitive imports.
// Uses lazy supabase loader. Mirrors signatures of original functions used on Index.

import type { PostgrestError, AuthError } from '@supabase/supabase-js';
import type { Offer, User } from './types';
import { getSupabase } from './supabase-lazy';

// Fetch active offers (simplified) - mirrors logic from api/offers.ts
export async function getActiveOffers(): Promise<Offer[]> {
  const supabase = await getSupabase();
  
  // First check: How many total offers exist?
  const { data: totalOffers, error: totalError } = await supabase
    .from('offers')
    .select('*', { count: 'exact', head: false })
    .limit(5);
  
  logger.debug('🔍 Total offers in DB:', totalOffers?.length || 0);
  if (totalOffers && totalOffers.length > 0) {
    logger.debug('📦 Sample offer:', {
      id: totalOffers[0].id,
      status: totalOffers[0].status,
      expires_at: totalOffers[0].expires_at,
      quantity_available: totalOffers[0].quantity_available,
      title: totalOffers[0].title
    });
  }
  
  // Query for ACTIVE status, not expired, and has stock
  const { data: offers, error } = await supabase
    .from('offers')
    .select('*')
    .eq('status', 'ACTIVE')
    .gt('expires_at', new Date().toISOString())
    .gt('quantity_available', 0)
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) {
    logger.warn('[api-lite] getActiveOffers error', error);
    return [];
  }

  logger.debug('✅ Active offers found:', offers?.length || 0);

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

export async function getCurrentUser(): Promise<{ user: User | null; error: AuthError | PostgrestError | null }> {
  const supabase = await getSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user: user as any as User | null, error };
}
