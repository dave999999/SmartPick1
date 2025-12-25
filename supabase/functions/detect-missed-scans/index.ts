// ============================================
// STEP 2: PASSIVE CONFIRMATION FLOW
// Handles forgotten QR scans with partner confirmation
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

/**
 * SAFETY PHILOSOPHY:
 * Instead of auto-punishing users for "no-shows" when partners forget to scan,
 * we ask the partner to confirm what actually happened.
 * Default assumption: pickup was successful (benefit of doubt to customer).
 * 
 * This prevents false penalties and builds trust in the system.
 */

async function sendTelegramMessage(chatId: string, text: string, inlineButtons?: any) {
  const payload: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
  };

  if (inlineButtons) {
    payload.reply_markup = {
      inline_keyboard: inlineButtons,
    };
  }

  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  return response.json();
}

serve(async (req) => {
  try {
    console.log('🕐 detect-missed-scans: Running passive confirmation check...');

    // ============================================
    // STEP 1: Find expired reservations that need confirmation
    // ============================================
    
    // Query reservations where:
    // - pickup_by has passed
    // - status is still 'active' (not picked up, not cancelled)
    // - confirmation_status is 'none' (not yet asked)
    const { data: expiredReservations, error: queryError } = await supabase
      .from('reservations')
      .select(`
        id,
        customer_id,
        offer_id,
        quantity,
        pickup_by,
        offer:offers (
          title,
          partner_id,
          partner:partners (
            business_name,
            user_id
          )
        )
      `)
      .eq('status', 'active')
      .eq('confirmation_status', 'none')
      .lt('pickup_by', new Date().toISOString());

    if (queryError) {
      console.error('❌ Error querying expired reservations:', queryError);
      throw queryError;
    }

    if (!expiredReservations || expiredReservations.length === 0) {
      console.log('✅ No expired reservations found. All good!');
      return new Response(
        JSON.stringify({ message: 'No expired reservations', count: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📋 Found ${expiredReservations.length} expired reservations needing confirmation`);

    // ============================================
    // STEP 2: For each expired reservation, ask partner
    // ============================================

    const results = await Promise.all(
      expiredReservations.map(async (reservation) => {
        try {
          const partnerId = reservation.offer.partner.user_id;
          const customerName = await getCustomerName(reservation.customer_id);
          const offerTitle = reservation.offer.title;

          // Update status to pending_partner
          const { error: updateError } = await supabase
            .from('reservations')
            .update({
              confirmation_status: 'pending_partner',
              confirmation_requested_at: new Date().toISOString(),
            })
            .eq('id', reservation.id);

          if (updateError) {
            console.error(`❌ Failed to update reservation ${reservation.id}:`, updateError);
            return { id: reservation.id, success: false, error: updateError.message };
          }

          // Get partner's Telegram chat ID
          const { data: partnerPrefs } = await supabase
            .from('notification_preferences')
            .select('telegram_chat_id')
            .eq('user_id', partnerId)
            .single();

          if (!partnerPrefs?.telegram_chat_id) {
            console.log(`⚠️ Partner ${partnerId} has no Telegram connected, skipping...`);
            // Auto-confirm after 24h will handle this
            return { id: reservation.id, success: false, reason: 'no_telegram' };
          }

          // Send confirmation request with inline buttons
          const message = `⏰ <b>Confirmation Needed</b>

It seems <b>${customerName}</b> didn't have their QR code scanned for:
<b>${offerTitle}</b> (${reservation.quantity}x)

<b>Did they actually pick it up?</b>

⚠️ If you don't respond in 24 hours, we'll assume they picked it up (benefit of doubt).`;

          const inlineButtons = [
            [
              {
                text: '✅ Yes, They Picked It Up',
                callback_data: `confirm_pickup:${reservation.id}`,
              },
            ],
            [
              {
                text: '❌ No, They Never Came',
                callback_data: `confirm_noshow:${reservation.id}`,
              },
            ],
          ];

          await sendTelegramMessage(
            partnerPrefs.telegram_chat_id,
            message,
            inlineButtons
          );

          console.log(`✅ Sent confirmation request for reservation ${reservation.id}`);

          return { id: reservation.id, success: true, partner_notified: true };
        } catch (error) {
          console.error(`❌ Error processing reservation ${reservation.id}:`, error);
          return { id: reservation.id, success: false, error: error.message };
        }
      })
    );

    // ============================================
    // STEP 3: Auto-confirm old pending confirmations (24h fallback)
    // ============================================
    
    // SAFETY: After 24 hours of no response, we assume pickup happened.
    // This prevents users from being unfairly penalized when partners don't respond.
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data: oldPending, error: oldPendingError } = await supabase
      .from('reservations')
      .select('id, customer_id, offer_id, quantity')
      .eq('confirmation_status', 'pending_partner')
      .lt('confirmation_requested_at', twentyFourHoursAgo.toISOString());

    if (oldPending && oldPending.length > 0) {
      console.log(`🔄 Auto-confirming ${oldPending.length} old pending reservations (24h passed)`);

      for (const reservation of oldPending) {
        // Mark as confirmed (benefit of doubt)
        const { error: confirmError } = await supabase
          .from('reservations')
          .update({
            status: 'picked_up',
            confirmation_status: 'confirmed',
            confirmation_resolved_at: new Date().toISOString(),
            auto_confirmed: true,
          })
          .eq('id', reservation.id);

        if (!confirmError) {
          // Update user reliability score (positive action)
          await supabase.rpc('update_user_reliability_score', {
            p_user_id: reservation.customer_id,
            p_action: 'completed',
          });

          console.log(`✅ Auto-confirmed reservation ${reservation.id} (benefit of doubt)`);
        }
      }
    }

    // ============================================
    // RESPONSE
    // ============================================

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        message: 'Passive confirmation check complete',
        total_expired: expiredReservations.length,
        notifications_sent: successCount,
        auto_confirmed: oldPending?.length || 0,
        results: results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ detect-missed-scans error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper function to get customer name
async function getCustomerName(customerId: string): Promise<string> {
  const { data: user } = await supabase.auth.admin.getUserById(customerId);
  
  if (user?.user?.user_metadata?.full_name) {
    return user.user.user_metadata.full_name;
  }
  
  return 'Customer';
}

/**
 * DEPLOYMENT:
 * 
 * 1. Deploy this function:
 *    supabase functions deploy detect-missed-scans
 * 
 * 2. Set up cron job in Supabase Dashboard:
 *    Function: detect-missed-scans
 *    Schedule: 0 * * * * (every hour)
 * 
 * 3. Or use SQL cron:
 *    SELECT cron.schedule(
 *      'passive-confirmation-check',
 *      '0 * * * *',
 *      $$SELECT net.http_post(
 *        url:='https://PROJECT.supabase.co/functions/v1/detect-missed-scans',
 *        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'
 *      ) as request_id;$$
 *    );
 */
