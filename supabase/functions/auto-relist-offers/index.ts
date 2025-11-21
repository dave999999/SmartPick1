// Daily Auto-Relist Edge Function
// This function runs daily to automatically relist offers for partners during their business hours

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

interface Partner {
  id: string;
  business_hours: {
    open: string;
    close: string;
  } | null;
  open_24h: boolean;
}

interface Offer {
  id: string;
  partner_id: string;
  title: string;
  quantity_available: number;
  auto_relist_enabled: boolean;
  last_relisted_at: string | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: { schema: 'public' },
        global: {
          headers: { 'x-connection-pool': 'transaction' }
        }
      }
    );

    // Get current time in UTC
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    console.log(`Auto-relist job started at ${now.toISOString()}`);

    // Get all active offers with auto-relist enabled
    const { data: offers, error: offersError } = await supabaseClient
      .from('offers')
      .select('id, partner_id, title, quantity_available, auto_relist_enabled, last_relisted_at')
      .eq('auto_relist_enabled', true)
      .eq('status', 'ACTIVE');

    if (offersError) {
      console.error('Error fetching offers:', offersError);
      throw offersError;
    }

    if (!offers || offers.length === 0) {
      console.log('No offers to relist');
      return new Response(
        JSON.stringify({ message: 'No offers to relist', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${offers.length} offers with auto-relist enabled`);

    // Get unique partner IDs
    const partnerIds = [...new Set(offers.map((o: Offer) => o.partner_id))];

    // Get partner business hours
    const { data: partners, error: partnersError } = await supabaseClient
      .from('partners')
      .select('id, business_hours, open_24h')
      .in('id', partnerIds)
      .eq('status', 'APPROVED');

    if (partnersError) {
      console.error('Error fetching partners:', partnersError);
      throw partnersError;
    }

    console.log(`Found ${partners?.length || 0} active partners`);

    // Create a map of partner business hours
    const partnerHoursMap = new Map<string, Partner>();
    partners?.forEach((p: Partner) => {
      partnerHoursMap.set(p.id, p);
    });

    // Filter offers that should be relisted based on business hours
    const offersToRelist: Offer[] = [];
    const today = now.toISOString().split('T')[0];

    for (const offer of offers) {
      const partner = partnerHoursMap.get(offer.partner_id);
      
      if (!partner) {
        console.log(`Partner ${offer.partner_id} not found or not approved`);
        continue;
      }

      // Check if already relisted today
      if (offer.last_relisted_at) {
        const lastRelistedDate = new Date(offer.last_relisted_at).toISOString().split('T')[0];
        if (lastRelistedDate === today) {
          console.log(`Offer ${offer.id} already relisted today`);
          continue;
        }
      }

      // Check if within business hours
      let shouldRelist = false;

      if (partner.open_24h) {
        shouldRelist = true;
      } else if (partner.business_hours) {
        const openTime = partner.business_hours.open;
        const closeTime = partner.business_hours.close;
        
        // Simple time comparison (assumes same timezone)
        if (currentTime >= openTime && currentTime <= closeTime) {
          shouldRelist = true;
        }
      }

      if (shouldRelist) {
        offersToRelist.push(offer);
      } else {
        console.log(`Offer ${offer.id} outside business hours`);
      }
    }

    console.log(`Relisting ${offersToRelist.length} offers`);

    // Relist offers
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const offer of offersToRelist) {
      try {
        const timestamp = now.toISOString();
        const pickupEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // +24 hours
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // +24 hours
        
        // Reset created_at to make offer appear as NEW on map (sorted by created_at DESC)
        // Also reset quantity to original total if available
        const { error: updateError } = await supabaseClient
          .from('offers')
          .update({
            last_relisted_at: timestamp,
            created_at: timestamp,        // Reset creation time - appears as NEW on map
            updated_at: timestamp,
            pickup_start: timestamp,      // Start pickup immediately
            pickup_end: pickupEnd,        // Extend pickup window by 24h
            expires_at: expiresAt,        // Extend expiration
            status: 'ACTIVE',             // Ensure it's active
          })
          .eq('id', offer.id);

        if (updateError) {
          console.error(`Error relisting offer ${offer.id}:`, updateError);
          results.failed++;
          results.errors.push(`${offer.title}: ${updateError.message}`);
        } else {
          console.log(`Successfully relisted offer ${offer.id}: ${offer.title}`);
          results.success++;
        }
      } catch (error) {
        console.error(`Exception relisting offer ${offer.id}:`, error);
        results.failed++;
        results.errors.push(`${offer.title}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`Relist job completed: ${results.success} succeeded, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        message: 'Auto-relist job completed',
        total_offers: offers.length,
        relisted: results.success,
        failed: results.failed,
        errors: results.errors,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Auto-relist job error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
