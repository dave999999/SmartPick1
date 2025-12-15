# 🔧 Telegram Notifications Troubleshooting Guide

## ❌ Current Issue
**Status**: `enable_telegram: false` (Notifications DISABLED)

The user has **NOT completed** the Telegram connection flow.

---

## 🔍 What's Happening

### Your Current State:
```json
{
  "enable_telegram": false,
  "telegram_username": null,
  "telegram_chat_id": null
}
```

This means:
- ❌ Telegram bot has NOT received `/start` command
- ❌ No chat_id stored in database
- ❌ Notifications will NOT be sent

---

## ✅ How to Fix (Step-by-Step)

### Option 1: Complete Connection Flow

1. **Go to User Profile or Settings page**
   - Look for "Telegram Notifications" card

2. **Click "Connect Telegram" button**
   - This opens Telegram with a special link
   - The link contains your user ID encoded

3. **In Telegram, click "START" button**
   - This is CRITICAL - without clicking START, the bot can't message you
   - The bot will save your chat_id and enable notifications

4. **Return to app**
   - Status should automatically update (we refresh after 3s and 8s)
   - You'll see "✅ Active" badge

5. **Verify connection**
   - Status should show:
     ```json
     {
       "enable_telegram": true,
       "telegram_username": "your_username",
       "telegram_chat_id": "123456789"
     }
     ```

### Option 2: Manual SQL Fix (Admin Only)

If the webhook isn't working, manually update the database:

```sql
-- Get your Telegram chat_id by messaging the bot first
-- Then run:
UPDATE notification_preferences
SET 
  enable_telegram = true,
  telegram_chat_id = 'YOUR_CHAT_ID', -- Get from Telegram
  telegram_username = 'YOUR_USERNAME',
  updated_at = NOW()
WHERE user_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';
```

---

## 🔍 Debugging Tools

### 1. Check Notification Preferences Table
```sql
SELECT 
  user_id,
  enable_telegram,
  telegram_chat_id,
  telegram_username,
  created_at,
  updated_at
FROM notification_preferences
WHERE user_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';
```

### 2. Test Telegram Bot Connection

Go to: `/notifications-debug` page (if you have it)

Or manually invoke the function:
```javascript
const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    userId: '0f069ba3-2c87-44fe-99a0-97ba74532a86',
    message: 'Test notification',
    type: 'customer'
  }
});
console.log({ data, error });
```

Expected response if NOT connected:
```json
{
  "success": false,
  "message": "Telegram notifications disabled"
}
```

Expected response if CONNECTED:
```json
{
  "success": true,
  "message": "Notification sent successfully"
}
```

### 3. Check Telegram Webhook

Verify webhook is set:
```bash
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

Expected response:
```json
{
  "ok": true,
  "result": {
    "url": "https://ggzhtpaxnhwcilomswtm.supabase.co/functions/v1/telegram-webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "last_error_date": null
  }
}
```

---

## 🔄 Connection Flow Diagram

```
User clicks "Connect Telegram"
    ↓
Opens t.me/SmartPickGE_bot?start=<encoded_user_id>
    ↓
User clicks "START" in Telegram
    ↓
Telegram sends webhook to Supabase Edge Function
    ↓
Edge Function decodes user_id from start parameter
    ↓
Updates notification_preferences:
  - enable_telegram = true
  - telegram_chat_id = <chat_id>
  - telegram_username = <username>
    ↓
Bot sends confirmation message: "✅ Success! Your account is connected"
    ↓
App auto-refreshes status (3s and 8s after opening)
    ↓
UI shows "✅ Active" badge
```

---

## 🚨 Common Issues

### Issue 1: Webhook Not Responding
**Symptoms**: User clicks START but status doesn't update

**Solutions**:
1. Check Supabase Edge Function logs
2. Verify `TELEGRAM_BOT_TOKEN` env var is set
3. Check webhook URL is correct:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
   ```

### Issue 2: Invalid User ID in Start Parameter
**Symptoms**: Bot says "Invalid connection link"

**Solutions**:
1. Check `getTelegramBotLink()` function encoding
2. Verify UUID format is correct
3. User should get a fresh link from the app

### Issue 3: Rate Limiting
**Symptoms**: Bot says "Too many commands"

**Solutions**:
1. Wait 1 minute before trying again
2. Limit: 20 messages per minute per chat

### Issue 4: Database Row Doesn't Exist
**Symptoms**: Query returns null

**Solutions**:
The `useTelegramStatus` hook now auto-creates rows:
```typescript
// Create initial row with defaults
await supabase
  .from('notification_preferences')
  .insert({
    user_id: userId,
    enable_telegram: false,
    telegram_chat_id: null,
    telegram_username: null
  })
```

---

## 🎯 Testing After Fix

### Test 1: Check Status
```javascript
const { data } = await supabase
  .from('notification_preferences')
  .select('*')
  .eq('user_id', '0f069ba3-2c87-44fe-99a0-97ba74532a86')
  .single();

console.log('Status:', {
  connected: data.enable_telegram && !!data.telegram_chat_id,
  chat_id: data.telegram_chat_id,
  username: data.telegram_username
});
```

### Test 2: Send Test Message
```javascript
const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    userId: '0f069ba3-2c87-44fe-99a0-97ba74532a86',
    message: '🎉 Test notification from SmartPick!',
    type: 'customer'
  }
});

if (data?.success) {
  console.log('✅ Notification sent! Check Telegram');
} else {
  console.error('❌ Failed:', data?.message || error);
}
```

### Test 3: Make a Real Reservation
When you make a reservation, you should receive:
- ✅ Reservation confirmation message
- ✅ Partner details
- ✅ Pickup time

Partner should receive:
- ✅ New reservation alert
- ✅ Customer name
- ✅ Order details

---

## 🔐 Security Checks

### Valid Configuration:
- ✅ Webhook uses HTTPS
- ✅ Bot token stored in env vars (not client-side)
- ✅ Rate limiting enabled (20 msg/min)
- ✅ UUID validation on start parameter
- ✅ User ID encoding prevents tampering

### Environment Variables Required:
```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
VITE_TELEGRAM_BOT_USERNAME=SmartPickGE_bot
```

---

## 📊 What Happens After Connection

### Customer Receives:
1. **Reservation Confirmed** when they make a reservation
2. **Pickup Reminder** before expiration
3. **New Offers** from favorite partners

### Partner Receives:
1. **New Reservation** when customer reserves
2. **Pickup Completed** when customer picks up
3. **Low Stock Alert** when offers running out

---

## 🎉 Success Criteria

After successful connection, you should see:

### In Database:
```sql
SELECT * FROM notification_preferences 
WHERE user_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';

-- Result:
enable_telegram: true
telegram_chat_id: "123456789" (your actual chat_id)
telegram_username: "your_username"
```

### In Telegram:
```
✅ Success! Your SmartPick account is now connected.

You'll receive notifications about:
🎉 New reservations
⏰ Pickup reminders
🎁 Special offers
✅ Order confirmations
```

### In App UI:
- ✅ Green "Active" badge
- ✅ Shows @username
- ✅ "Disable notifications" button visible

---

## 🛠️ Next Steps

1. **User**: Click "Connect Telegram" button again
2. **User**: Click START in Telegram (CRITICAL!)
3. **Wait**: 3-8 seconds for auto-refresh
4. **Verify**: Status should show "✅ Active"
5. **Test**: Send test notification or make a reservation

If still not working after this, check:
- Supabase Edge Function logs
- Telegram webhook status
- Database permissions
- Network/firewall issues

---

## 📞 Support

If issue persists:
1. Check Supabase logs: Dashboard → Edge Functions → send-notification → Logs
2. Check Telegram webhook: `/getWebhookInfo` endpoint
3. Verify bot token is correct and bot is not blocked
4. Check user has Telegram account and hasn't blocked the bot

**Most Common Fix**: User needs to click START button in Telegram!
