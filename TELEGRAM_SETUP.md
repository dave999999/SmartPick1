# 🤖 Telegram Bot Setup Guide

This guide will help you set up the Telegram bot for SmartPick notifications.

## Step 1: Create Bot with BotFather

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose name: **SmartPick Notifications**
4. Choose username: **SmartPickGeBot** (must end with "bot")
5. **SAVE THE TOKEN!** You'll need it later.

Example token: `6234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`

## Step 2: Set Bot Description & Commands

Send these commands to BotFather:

```
/setdescription @SmartPickGeBot
```
Then paste:
```
SmartPick - Smart choice every day!
Get instant notifications about your reservations and offers.
```

```
/setcommands @SmartPickGeBot
```
Then paste:
```
start - Connect your account
help - Get help
status - Check connection status
```

## Step 3: Create Supabase Edge Function

We need a webhook to handle incoming messages from users.

**Create file:** `supabase/functions/telegram-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

serve(async (req) => {
  try {
    const update = await req.json()

    // Handle /start command
    if (update.message?.text?.startsWith('/start')) {
      const chatId = update.message.chat.id
      const username = update.message.from.username
      const text = update.message.text

      // Extract user ID from start parameter
      const params = text.split(' ')
      if (params.length > 1) {
        const encodedUserId = params[1]
        const userId = atob(encodedUserId)

        // Save chat ID to database
        await supabase
          .from('notification_preferences')
          .upsert({
            user_id: userId,
            telegram_chat_id: chatId.toString(),
            telegram_username: username,
            enable_telegram: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          })

        // Send confirmation message
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ Success! Your SmartPick account is now connected to Telegram.

You'll receive notifications about:
🎉 New reservations
⏰ Pickup reminders
🎁 Special offers

You can disconnect anytime from your dashboard.`,
            parse_mode: 'HTML'
          })
        })
      } else {
        // No user ID provided
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `👋 Welcome to SmartPick!

To connect your account:
1. Open SmartPick app
2. Go to Settings/Profile
3. Click "Connect Telegram"
4. You'll be redirected back here

Need help? Visit smartpick.ge`,
            parse_mode: 'HTML'
          })
        })
      }
    }

    // Handle /status command
    else if (update.message?.text === '/status') {
      const chatId = update.message.chat.id

      // Check if chat ID is connected
      const { data } = await supabase
        .from('notification_preferences')
        .select('user_id, telegram_username')
        .eq('telegram_chat_id', chatId.toString())
        .single()

      if (data) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ Connected!

Your account is receiving notifications.
Username: @${data.telegram_username || 'Not set'}

To disconnect, go to your SmartPick dashboard.`,
            parse_mode: 'HTML'
          })
        })
      } else {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `❌ Not connected

You need to connect your SmartPick account first.
Visit smartpick.ge and click "Connect Telegram" in your profile.`,
            parse_mode: 'HTML'
          })
        })
      }
    }

    // Handle /help command
    else if (update.message?.text === '/help') {
      const chatId = update.message.chat.id

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `📱 SmartPick Bot Help

<b>Available Commands:</b>
/start - Connect your account
/status - Check connection status
/help - Show this message

<b>What you'll receive:</b>
🎉 New reservation alerts (Partners)
⏰ Pickup reminders (Customers)
🎁 Special offers and deals
✅ Order confirmations

<b>Need support?</b>
Visit: smartpick.ge
Email: support@smartpick.ge`,
          parse_mode: 'HTML'
        })
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
```

## Step 4: Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref ***REMOVED_PROJECT_ID***

# Set secrets
supabase secrets set TELEGRAM_BOT_TOKEN=your_bot_token_here

# Deploy the function
supabase functions deploy telegram-webhook
```

## Step 5: Set Webhook URL

After deploying, set the webhook URL for your bot:

```bash
curl -X POST https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url":"https://***REMOVED_PROJECT_ID***.supabase.co/functions/v1/telegram-webhook"}'
```

Replace `<YOUR_BOT_TOKEN>` with your actual bot token.

## Step 6: Test the Bot

1. Open Telegram
2. Search for your bot (@SmartPickGeBot)
3. Send `/start`
4. You should receive a welcome message
5. Send `/status` to check connection status

## Step 7: Add to Your App

The UI components are already created! Just add them to your dashboards:

**Partner Dashboard:**
```tsx
import { TelegramConnect } from '@/components/TelegramConnect';

// In your component:
<TelegramConnect userId={partnerId} userType="partner" />
```

**Customer Profile:**
```tsx
import { TelegramConnect } from '@/components/TelegramConnect';

// In your component:
<TelegramConnect userId={customerId} userType="customer" />
```

## Testing Notifications

Use the functions from `src/lib/telegram.ts`:

```typescript
import { notifyPartnerNewReservation } from '@/lib/telegram';

// When customer makes reservation:
await notifyPartnerNewReservation(
  partnerId,
  'John Doe',
  'Fresh Croissants',
  2,
  '6:30 PM'
);
```

## Troubleshooting

**Bot not responding:**
- Check webhook is set: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- Check Edge Function logs in Supabase dashboard
- Verify TELEGRAM_BOT_TOKEN secret is set

**Connection not saving:**
- Check notification_preferences table exists
- Verify RLS policies allow inserts
- Check browser console for errors

**Messages not sending:**
- Verify bot token is correct
- Check user has connected Telegram
- Ensure enable_telegram is true in database

## Environment Variables

Add to your `.env` and Vercel/Netlify:

```
VITE_TELEGRAM_BOT_TOKEN=6234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
```

## Database Check

Run this to verify everything is set up:

```sql
-- Check notification preferences table
SELECT * FROM notification_preferences
WHERE telegram_chat_id IS NOT NULL;

-- Check if RLS allows inserts
SELECT tablename, policyname
FROM pg_policies
WHERE tablename = 'notification_preferences';
```

---

## 🎉 You're Done!

Your Telegram bot is now ready to send notifications!

**Next steps:**
1. Integrate notification calls in your reservation flow
2. Set up scheduled jobs for pickup reminders
3. Add new offer alerts
