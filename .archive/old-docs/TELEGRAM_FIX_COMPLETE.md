# Telegram Integration - Fixed Issues

## Problems Identified and Fixed

### 1. ❌ **Undefined Variable Error in send-notification Function**
**Issue:** The `send-notification` Edge Function was using `corsHeaders` variable that didn't exist, causing all notification attempts to fail.

**Fix:** Changed all instances of `corsHeaders` to `secureHeaders` (which is properly defined at the top of the function).

**Files Changed:**
- `supabase/functions/send-notification/index.ts`

### 2. ⚠️ **Database Query Error Handling**
**Issue:** Using `.single()` would throw errors when no record exists, preventing graceful fallback.

**Fix:** Changed `.single()` to `.maybeSingle()` to handle missing records gracefully.

### 3. 📝 **Missing Initial Record Creation**
**Issue:** The `useTelegramStatus` hook now properly creates an initial `notification_preferences` record if one doesn't exist.

**Fix:** Added automatic record creation in the `fetchTelegramStatus()` function.

## How Telegram Integration Works

### For Users (Customers)
1. User opens Profile > Settings
2. Sees Telegram toggle (initially OFF)
3. Clicks toggle → Opens Telegram bot link
4. Clicks START in Telegram
5. Bot saves connection to database
6. Toggle turns ON automatically
7. User receives reservation notifications

### For Partners
1. Partner opens Dashboard > Settings section
2. Sees Telegram toggle (initially OFF)
3. Clicks toggle → Opens Telegram bot link
4. Clicks START in Telegram
5. Bot saves connection to database
6. Toggle turns ON automatically
7. Partner receives new reservation notifications

## Testing Telegram Integration

### 1. Test Connection Flow
```sql
-- Run in Supabase SQL Editor
SELECT * FROM public.notification_preferences 
WHERE user_id = 'YOUR-USER-ID';
```

### 2. Verify Bot Token
Check in Supabase Dashboard → Edge Functions → telegram-webhook → Secrets:
- `TELEGRAM_BOT_TOKEN` should be set

### 3. Test Bot Manually
Open in browser:
```
https://t.me/SmartPickGE_bot?start=test
```

Should respond with welcome message.

### 4. Verify Edge Functions
Both functions should be deployed:
- ✅ `telegram-webhook` (handles /start command, no JWT verification)
- ✅ `send-notification` (sends actual notifications, requires authentication)

## Common Issues and Solutions

### Issue: "Telegram notifications unavailable"
**Solution:** Run deployment script:
```powershell
.\deploy-telegram-functions.ps1
```

### Issue: Toggle doesn't turn ON
**Solutions:**
1. Check browser console for errors
2. Verify user clicked START in Telegram
3. Run diagnostic query:
```sql
SELECT * FROM public.notification_preferences WHERE enable_telegram = true;
```

### Issue: No notifications received
**Solutions:**
1. Verify connection exists:
```sql
SELECT telegram_chat_id, enable_telegram 
FROM notification_preferences 
WHERE user_id = 'USER-ID';
```

2. Test send-notification function manually (in Supabase Dashboard > Edge Functions)

3. Check Telegram bot is not blocked by user

### Issue: "Link expired"
**Solution:** Links expire after 24 hours. User needs to click "Connect Telegram" again to get a fresh link.

## Deployment Checklist

- [x] Fixed `corsHeaders` undefined variable
- [x] Deployed `telegram-webhook` function
- [x] Deployed `send-notification` function
- [x] Verified `notification_preferences` table exists
- [x] Verified RLS policies are correct
- [x] Bot token is set in Supabase secrets

## Next Steps for Users

1. **Open SmartPick App**: smartpick.ge
2. **Go to Settings**: 
   - Customers: Profile → Settings → Telegram
   - Partners: Dashboard → Settings → Telegram
3. **Click Telegram Toggle**: Opens bot link
4. **Click START in Telegram**: Saves connection
5. **Verify**: Toggle should turn green automatically

## Technical Details

### Link Format
```
https://t.me/SmartPickGE_bot?start={base64url_userId}_{timestamp}
```

- `base64url_userId`: User's UUID encoded in base64url format
- `timestamp`: Current timestamp to prevent caching and enable 24h expiration

### Database Schema
```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  enable_telegram BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Security Features
- ✅ 24-hour link expiration
- ✅ UUID validation (prevents old email-based links)
- ✅ Rate limiting (20 messages/minute per chat)
- ✅ Secret token verification for webhook
- ✅ RLS policies (users can only manage their own preferences)

## Status: ✅ FIXED AND DEPLOYED

Both partners and customers should now be able to:
1. Connect Telegram successfully
2. Receive notifications
3. Disconnect/reconnect anytime

Last updated: 2025-11-23
