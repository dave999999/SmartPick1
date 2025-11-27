import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Reservation {
  id: string;
  customer_id: string;
  partner_id: string;
  offer_id: string;
  status: string;
  offers?: {
    pickup_end: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('[Detect Missed Pickups] Starting cron job...');

    // Find all ACTIVE reservations where the offer's pickup_end has passed
    const now = new Date().toISOString();
    const { data: missedReservations, error: fetchError } = await supabaseClient
      .from('reservations')
      .select(`
        id, 
        customer_id,
        partner_id, 
        offer_id,
        status,
        offers!inner(pickup_end)
      `)
      .eq('status', 'ACTIVE')
      .lt('offers.pickup_end', now);

    if (fetchError) {
      console.error('[Detect Missed Pickups] Error fetching reservations:', fetchError);
      throw fetchError;
    }

    if (!missedReservations || missedReservations.length === 0) {
      console.log('[Detect Missed Pickups] No missed pickups found.');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No missed pickups detected',
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Detect Missed Pickups] Found ${missedReservations.length} missed pickups`);

    const results = {
      processed: missedReservations.length,
      penalties_applied: 0,
      errors: [] as string[],
    };

    // Process each missed reservation
    for (const reservation of missedReservations as Reservation[]) {
      try {
        console.log(`[Detect Missed Pickups] Processing reservation ${reservation.id} for user ${reservation.customer_id}`);

        // 1. Mark reservation as FAILED_PICKUP
        const { error: updateError } = await supabaseClient
          .from('reservations')
          .update({ status: 'FAILED_PICKUP' })
          .eq('id', reservation.id);

        if (updateError) {
          console.error(`[Detect Missed Pickups] Error updating reservation ${reservation.id}:`, updateError);
          results.errors.push(`Failed to update reservation ${reservation.id}`);
          continue;
        }

        // 2. Get user's penalty history to determine offense count
        const { data: history, error: historyError } = await supabaseClient
          .from('penalty_offense_history')
          .select('offense_count')
          .eq('user_id', reservation.customer_id)
          .single();

        if (historyError && historyError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is fine for first offense
          console.error(`[Detect Missed Pickups] Error fetching history for user ${reservation.customer_id}:`, historyError);
          results.errors.push(`Failed to fetch history for user ${reservation.customer_id}`);
          continue;
        }

        const currentOffenseCount = history?.offense_count || 0;
        const newOffenseCount = currentOffenseCount + 1;

        console.log(`[Detect Missed Pickups] User ${reservation.customer_id}: offense ${currentOffenseCount} → ${newOffenseCount}`);

        // 3. Determine penalty type
        let penaltyType: 'warning' | 'suspension_1h' | 'suspension_24h' | 'permanent_ban';
        let endsAt: string | null = null;

        if (newOffenseCount === 1) {
          penaltyType = 'warning';
        } else if (newOffenseCount === 2) {
          penaltyType = 'suspension_1h';
          endsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
        } else if (newOffenseCount === 3) {
          penaltyType = 'suspension_24h';
          endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now
        } else {
          penaltyType = 'permanent_ban';
        }

        // 4. Create penalty record
        const { error: penaltyError } = await supabaseClient
          .from('user_penalties')
          .insert({
            user_id: reservation.customer_id,
            type: penaltyType,
            reason: 'missed_pickup',
            reservation_id: reservation.id,
            offer_id: reservation.offer_id,
            partner_id: reservation.partner_id,
            offense_number: newOffenseCount,
            ends_at: endsAt,
            is_active: true,
          });

        if (penaltyError) {
          console.error(`[Detect Missed Pickups] Error creating penalty for user ${reservation.customer_id}:`, penaltyError);
          results.errors.push(`Failed to create penalty for user ${reservation.customer_id}`);
          continue;
        }

        // 5. Update offense history (upsert)
        const { error: historyUpdateError } = await supabaseClient
          .from('penalty_offense_history')
          .upsert(
            {
              user_id: reservation.customer_id,
              offense_count: newOffenseCount,
              total_penalties_received: (history?.offense_count || 0) + 1,
              last_offense_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (historyUpdateError) {
          console.error(`[Detect Missed Pickups] Error updating history for user ${reservation.customer_id}:`, historyUpdateError);
          results.errors.push(`Failed to update history for user ${reservation.customer_id}`);
          continue;
        }

        results.penalties_applied++;
        console.log(`[Detect Missed Pickups] Successfully applied ${penaltyType} to user ${reservation.customer_id}`);

        // 6. Send notification to user
        try {
          const { error: notifError } = await supabaseClient.from('notifications').insert({
            user_id: reservation.customer_id,
            title: penaltyType === 'warning' ? 'Warning: Missed Pickup' : 'Account Suspended',
            message:
              penaltyType === 'warning'
                ? 'You missed a pickup. Next missed pickup will result in a 1-hour suspension.'
                : penaltyType === 'permanent_ban'
                ? 'Your account has been permanently banned due to repeated missed pickups.'
                : `You missed a pickup and your account is temporarily suspended until ${new Date(
                    endsAt!
                  ).toLocaleString()}.`,
            type: 'penalty',
            metadata: {
              penalty_type: penaltyType,
              offense_number: newOffenseCount,
              reservation_id: reservation.id,
            },
          });

          if (notifError) {
            console.warn(`[Detect Missed Pickups] Failed to send notification to user ${reservation.customer_id}:`, notifError);
          }
        } catch (notifErr) {
          console.warn(`[Detect Missed Pickups] Exception sending notification:`, notifErr);
        }
      } catch (error) {
        console.error(`[Detect Missed Pickups] Unexpected error processing reservation ${reservation.id}:`, error);
        results.errors.push(`Unexpected error for reservation ${reservation.id}`);
      }
    }

    console.log('[Detect Missed Pickups] Cron job completed:', results);

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Detect Missed Pickups] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
