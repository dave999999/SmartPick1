// ============================================
// STEP 3: SMART BATCHING SYSTEM
// Prevents notification spam by batching messages
// ============================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { v4 as uuidv4 } from 'https://esm.sh/uuid@9.0.0';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

/**
 * ANTI-SPAM PHILOSOPHY:
 * Instead of sending 10 individual notifications in quick succession,
 * we batch them into a single summary message every 5 minutes.
 * 
 * This respects partners' attention and prevents notification fatigue.
 */

async function sendTelegramMessage(chatId: string, text: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    }
  );

  return response.json();
}

serve(async (req) => {
  try {
    console.log('📦 flush-notification-queue: Running batching check...');

    // ============================================
    // STEP 1: Check if it's silent hours for any partners
    // ============================================
    
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay(); // 0 = Sunday

    // ============================================
    // STEP 2: Get pending notifications grouped by partner
    // ============================================
    
    const { data: pendingNotifications, error: queryError } = await supabase
      .from('notification_queue')
      .select('id, partner_id, message_type, message_text, metadata, created_at')
      .is('processed_at', null)
      .order('partner_id')
      .order('created_at');

    if (queryError) {
      console.error('❌ Error querying notification queue:', queryError);
      throw queryError;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('✅ No pending notifications. Queue is empty!');
      return new Response(
        JSON.stringify({ message: 'No pending notifications', count: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📋 Found ${pendingNotifications.length} pending notifications`);

    // Group by partner
    const notificationsByPartner = new Map<string, typeof pendingNotifications>();
    for (const notification of pendingNotifications) {
      const partnerId = notification.partner_id;
      if (!notificationsByPartner.has(partnerId)) {
        notificationsByPartner.set(partnerId, []);
      }
      notificationsByPartner.get(partnerId)!.push(notification);
    }

    console.log(`👥 Grouped into ${notificationsByPartner.size} partners`);

    // ============================================
    // STEP 3: For each partner, decide: batch or send individual
    // ============================================

    const results = [];

    for (const [partnerId, notifications] of notificationsByPartner) {
      try {
        // Get partner config
        const { data: partner, error: partnerError } = await supabase
          .from('partners')
          .select(`
            batching_enabled,
            batching_window_minutes,
            silent_hours,
            user_id
          `)
          .eq('id', partnerId)
          .single();

        if (partnerError || !partner) {
          console.error(`❌ Partner ${partnerId} not found:`, partnerError);
          continue;
        }

        // Check silent hours
        if (partner.silent_hours) {
          const silentHours = partner.silent_hours as { start: number; end: number };
          const isInSilentHours = 
            silentHours.start <= currentHour && currentHour < silentHours.end;
          
          if (isInSilentHours) {
            console.log(`🔕 Skipping partner ${partnerId} (silent hours: ${silentHours.start}-${silentHours.end})`);
            results.push({
              partnerId,
              action: 'skipped',
              reason: 'silent_hours',
              count: notifications.length,
            });
            continue;
          }
        }

        // Get Telegram chat ID
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('telegram_chat_id')
          .eq('user_id', partner.user_id)
          .single();

        if (!prefs?.telegram_chat_id) {
          console.log(`⚠️ Partner ${partnerId} has no Telegram, marking as processed...`);
          // Mark as processed anyway (no point keeping them)
          await supabase
            .from('notification_queue')
            .update({ processed_at: new Date().toISOString() })
            .in('id', notifications.map(n => n.id));
          
          results.push({
            partnerId,
            action: 'skipped',
            reason: 'no_telegram',
            count: notifications.length,
          });
          continue;
        }

        // Check if batching is enabled
        const batchingEnabled = partner.batching_enabled ?? true;
        const batchingWindow = partner.batching_window_minutes ?? 5;

        // Check if oldest notification has aged enough
        const oldestNotification = notifications[0];
        const ageMinutes = (Date.now() - new Date(oldestNotification.created_at).getTime()) / 60000;

        if (ageMinutes < batchingWindow) {
          console.log(`⏳ Partner ${partnerId}: Oldest notification is ${ageMinutes.toFixed(1)}min old (window: ${batchingWindow}min), waiting...`);
          results.push({
            partnerId,
            action: 'waiting',
            reason: 'not_aged_enough',
            count: notifications.length,
            ageMinutes: ageMinutes.toFixed(1),
          });
          continue;
        }

        // Decision: batch or individual?
        if (!batchingEnabled || notifications.length === 1) {
          // Send individual message
          console.log(`📤 Sending individual notification to partner ${partnerId}`);
          
          await sendTelegramMessage(
            prefs.telegram_chat_id,
            notifications[0].message_text
          );

          // Mark as processed
          await supabase
            .from('notification_queue')
            .update({ 
              processed_at: new Date().toISOString(),
              batch_id: null,
            })
            .eq('id', notifications[0].id);

          results.push({
            partnerId,
            action: 'sent_individual',
            count: 1,
          });
        } else {
          // Batch multiple notifications
          console.log(`📦 Batching ${notifications.length} notifications for partner ${partnerId}`);
          
          const batchId = uuidv4();
          const summary = createBatchSummary(notifications);

          await sendTelegramMessage(
            prefs.telegram_chat_id,
            summary
          );

          // Mark all as processed with batch_id
          await supabase
            .from('notification_queue')
            .update({ 
              processed_at: new Date().toISOString(),
              batch_id: batchId,
            })
            .in('id', notifications.map(n => n.id));

          results.push({
            partnerId,
            action: 'sent_batch',
            count: notifications.length,
            batchId,
          });
        }
      } catch (error) {
        console.error(`❌ Error processing partner ${partnerId}:`, error);
        results.push({
          partnerId,
          action: 'error',
          error: error.message,
        });
      }
    }

    // ============================================
    // RESPONSE
    // ============================================

    return new Response(
      JSON.stringify({
        message: 'Notification queue flushed',
        total_pending: pendingNotifications.length,
        partners_processed: notificationsByPartner.size,
        results: results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ flush-notification-queue error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Creates a batch summary message
 */
function createBatchSummary(notifications: any[]): string {
  // Count by message type
  const typeCounts = new Map<string, number>();
  for (const notification of notifications) {
    const type = notification.message_type;
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  }

  // Build summary with emojis
  const typeEmojis: Record<string, string> = {
    new_order: '🎉',
    cancellation: '❌',
    low_stock: '📦',
    pickup_complete: '✅',
    no_show: '⚠️',
    reminder: '⏰',
  };

  let summary = `📊 <b>Notification Summary</b>\n\n`;
  summary += `You have ${notifications.length} updates:\n\n`;

  for (const [type, count] of typeCounts) {
    const emoji = typeEmojis[type] || '📬';
    const label = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    summary += `${emoji} ${count}x ${label}\n`;
  }

  summary += `\n<i>Individual details have been grouped to reduce notifications.</i>`;

  return summary;
}

/**
 * DEPLOYMENT:
 * 
 * 1. Deploy this function:
 *    supabase functions deploy flush-notification-queue
 * 
 * 2. Set up cron job in Supabase Dashboard:
 *    Function: flush-notification-queue
 *    Schedule: */5 * * * * (every 5 minutes)
 * 
 * 3. Or use SQL cron:
 *    SELECT cron.schedule(
 *      'flush-notification-queue',
 *      '*/5 * * * *',
 *      $$SELECT net.http_post(
 *        url:='https://PROJECT.supabase.co/functions/v1/flush-notification-queue',
 *        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'
 *      ) as request_id;$$
 *    );
 */
