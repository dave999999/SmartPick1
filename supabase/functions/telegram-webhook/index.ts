import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getRateLimitIdentifier, rateLimitResponse } from '../_shared/rateLimit.ts'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' },
  global: {
    headers: { 'x-connection-pool': 'transaction' }
  }
})

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  })
}

const TELEGRAM_WEBHOOK_SECRET = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') || 'SmartPickTelegramWebhook2024'

serve(async (req) => {
  try {
    // Verify Telegram secret token
    const secretToken = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if (secretToken !== TELEGRAM_WEBHOOK_SECRET) {
      console.error('❌ Invalid secret token')
      return new Response('Unauthorized', { status: 401 })
    }

    const update = await req.json()
    console.log('Received update:', JSON.stringify(update))

    if (!update.message) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const chatId = update.message.chat.id
    const username = update.message.from.username
    const text = update.message.text

    // SECURITY: Rate limiting - 20 messages per minute per chat
    const rateLimitId = `telegram:${chatId}`;
    const rateLimit = await checkRateLimit(supabase, rateLimitId, 'telegram-message', 20, 60);
    
    if (!rateLimit.allowed) {
      console.log(`[telegram-webhook] Rate limit exceeded for chat ${chatId}`);
      await sendTelegramMessage(chatId, '⚠️ Too many commands. Please wait a moment and try again.');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Handle /start command
    if (text?.startsWith('/start')) {
      const params = text.split(' ')

      if (params.length > 1) {
        // User clicked link from app
        let encodedUserId = params[1]
        let linkTimestamp: number | null = null;
        
        // Extract and validate timestamp (format: base64_timestamp)
        const lastUnderscore = encodedUserId.lastIndexOf('_');
        if (lastUnderscore > 0 && /^\d+$/.test(encodedUserId.substring(lastUnderscore + 1))) {
          linkTimestamp = parseInt(encodedUserId.substring(lastUnderscore + 1), 10);
          encodedUserId = encodedUserId.substring(0, lastUnderscore);
          
          // Check if link is expired (24 hours = 86400000 ms)
          const now = Date.now();
          const linkAge = now - linkTimestamp;
          if (linkAge > 86400000) {
            console.warn(`[telegram-webhook] Link expired (age: ${Math.round(linkAge / 3600000)}h)`);
            await sendTelegramMessage(chatId, 
              `⏰ <b>This connection link has expired.</b>\n\n` +
              `📱 Please get a new link from SmartPick:\n` +
              `1. Open SmartPick app\n` +
              `2. Go to your Dashboard\n` +
              `3. Click "Connect Telegram"\n\n` +
              `Links expire after 24 hours for security.`
            );
            return new Response(JSON.stringify({ ok: true }), {
              headers: { 'Content-Type': 'application/json' },
              status: 200
            });
          }
        }

        try {
          // Decode user ID (support base64url without padding)
          const normalized = encodedUserId.replace(/-/g, '+').replace(/_/g, '/');
          let padded = normalized;
          const mod = normalized.length % 4;
          if (mod === 2) padded += '==';
          else if (mod === 3) padded += '=';
          else if (mod === 1) throw new Error('Invalid start parameter length');
          const userId = atob(padded)

          // SECURITY: Validate UUID format to prevent injection attacks
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(userId)) {
            console.error('[telegram-webhook] Invalid user ID format (old link detected):', userId);
            await sendTelegramMessage(chatId, 
              `❌ <b>This connection link has expired.</b>\n\n` +
              `📱 Please get a new connection link:\n` +
              `1. Open SmartPick app\n` +
              `2. Go to your Dashboard\n` +
              `3. Click "Connect Telegram" button\n` +
              `4. Click the new link that opens\n\n` +
              `This ensures your account is connected securely.`
            );
            return new Response(JSON.stringify({ ok: true }), {
              headers: { 'Content-Type': 'application/json' },
              status: 200
            });
          }

          // Save chat ID to database
          console.log(`📝 Attempting to save connection for user ${userId}, chat ${chatId}`)
          const { data: upsertData, error: upsertError } = await supabase
            .from('notification_preferences')
            .upsert({
              user_id: userId,
              telegram_chat_id: chatId.toString(),
              telegram_username: username || null,
              enable_telegram: true,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            })
            .select()

          if (upsertError) {
            console.error('❌ Database error:', upsertError)
            await sendTelegramMessage(chatId, `❌ Error connecting your account. Please try again or contact support.`)
            return new Response(JSON.stringify({ error: upsertError.message }), {
              headers: { 'Content-Type': 'application/json' },
              status: 500
            })
          }
          
          console.log('✅ Database save successful:', upsertData)

          // Send success message
          await sendTelegramMessage(
            chatId,
            `✅ <b>Success! Your SmartPick account is now connected.</b>

You'll receive notifications about:
🎉 New reservations
⏰ Pickup reminders
🎁 Special offers
✅ Order confirmations

You can disconnect anytime from your dashboard.

Type /status to check your connection.
Type /help for more information.`
          )
        } catch (error) {
          console.error('Error decoding user ID:', error)
          await sendTelegramMessage(
            chatId,
            `❌ Invalid connection link. Please try again from the SmartPick app.`
          )
        }
      } else {
        // Direct /start without parameter
        await sendTelegramMessage(
          chatId,
          `👋 <b>Welcome to SmartPick!</b>

Smart choice every day - Get notifications about your orders and offers.

<b>To connect your account:</b>
1. Open SmartPick app (smartpick.ge)
2. Go to Settings/Profile
3. Click "Connect Telegram"
4. You'll be redirected back here

Need help? Visit smartpick.ge or type /help`
        )
      }
    }

    // Handle /status command
    else if (text === '/status') {
      const { data: connection } = await supabase
        .from('notification_preferences')
        .select('user_id, telegram_username, enable_telegram')
        .eq('telegram_chat_id', chatId.toString())
        .single()

      if (connection && connection.enable_telegram) {
        await sendTelegramMessage(
          chatId,
          `✅ <b>Connected!</b>

Your SmartPick account is receiving notifications.
Username: ${connection.telegram_username ? '@' + connection.telegram_username : 'Not set'}
Status: Active 🟢

To disconnect, go to your SmartPick dashboard.`
        )
      } else if (connection && !connection.enable_telegram) {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Connected but Disabled</b>

Your account is connected but notifications are turned off.
Enable them in your SmartPick dashboard settings.`
        )
      } else {
        await sendTelegramMessage(
          chatId,
          `❌ <b>Not Connected</b>

You need to connect your SmartPick account first.

<b>How to connect:</b>
1. Visit smartpick.ge
2. Sign in to your account
3. Click "Connect Telegram" in Settings
4. Follow the instructions

Type /help for more information.`
        )
      }
    }

    // Handle /help command
    else if (text === '/help') {
      await sendTelegramMessage(
        chatId,
        `📱 <b>SmartPick Bot - Help</b>

<b>Available Commands:</b>
/start - Connect your account
/status - Check connection status
/help - Show this message

<b>For Partners:</b>
🎉 New reservation alerts
✅ Pickup confirmations
❌ No-show notifications
⚠️ Low stock warnings

<b>For Customers:</b>
⏰ 15-min pickup reminders
✅ Reservation confirmations
🎁 New offer alerts

<b>Need Support?</b>
Website: smartpick.ge
Email: support@smartpick.ge

<b>Privacy:</b>
We only send notifications related to your SmartPick account.
You can disconnect anytime from your dashboard.`
      )
    }

    // Unknown command
    else {
      await sendTelegramMessage(
        chatId,
        `I don't understand that command. Type /help to see available commands.`
      )
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error processing update:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
