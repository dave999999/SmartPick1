# How to Check Supabase Edge Function Logs

## The Issue
Getting "❌ Error connecting your account" when connecting Telegram. Need to see actual error logs.

## Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Login to your account
3. Select your **SmartPick** project

## Step 2: Navigate to Edge Functions

1. Click **"Edge Functions"** in the left sidebar
2. You'll see list of all functions:
   - telegram-webhook ← **THIS IS THE ONE WE NEED**
   - send-notification
   - auto-expire-reservations
   - etc.

## Step 3: View Telegram Webhook Logs

1. Click on **"telegram-webhook"**
2. Click the **"Logs"** tab at the top
3. You'll see real-time logs

## Step 4: Reproduce the Error

1. Keep the logs page open
2. Open your partner dashboard
3. Click notifications icon
4. Toggle Telegram ON
5. Go to Telegram and send `/start`
6. Immediately check the logs page

## What to Look For in Logs

### ✅ Success Pattern:
```
INFO: Telegram update received
INFO: Saving Telegram connection
INFO: Telegram connection saved successfully
```

### ❌ Error Patterns:

**Pattern 1: Foreign Key Constraint**
```
ERROR: Database error saving connection
Error: insert or update on table "notification_preferences" violates foreign key constraint
Detail: Key (user_id)=(xxx) is not present in table "users"
```
**Solution:** Run `FIX_TELEGRAM_CONNECTION_ERROR.sql`

**Pattern 2: Invalid User ID**
```
ERROR: Invalid user ID format detected
```
**Solution:** Check partner.user_id is valid UUID

**Pattern 3: RLS Policy Block**
```
ERROR: Database error saving connection
Error: new row violates row-level security policy
```
**Solution:** Run `FIX_TELEGRAM_CONNECTION_ERROR.sql` (includes service role policy)

**Pattern 4: Missing Table**
```
ERROR: Database error saving connection
Error: relation "notification_preferences" does not exist
```
**Solution:** Run `FIX_TELEGRAM_CONNECTION_ERROR.sql`

## Step 5: Check Environment Variables

In Edge Functions dashboard, check if these are set:

1. Click **"telegram-webhook"** function
2. Click **"Settings"** or **"Secrets"** tab
3. Verify these exist:
   - `TELEGRAM_BOT_TOKEN` ← Your bot token from @BotFather
   - `TELEGRAM_WEBHOOK_SECRET` ← Secret for webhook verification
   - `SUPABASE_URL` ← Auto-set by Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` ← Auto-set by Supabase

If `TELEGRAM_BOT_TOKEN` is missing:
1. Go to Telegram
2. Message @BotFather
3. Send `/mybots`
4. Select your SmartPick bot
5. Click "API Token"
6. Copy the token
7. Add it to edge function secrets

## Step 6: Check Function Deployment Status

In the telegram-webhook page, check:
- **Status:** Should be green "Deployed"
- **Version:** Latest version number
- **Last Deployed:** Recent timestamp

If status is red or old:
1. Click **"Deploy"** button
2. Wait for deployment to complete
3. Try connecting again

## Step 7: Test with Manual Request

In Supabase SQL Editor, run this to test directly:

```sql
-- Get a valid user_id from a partner
SELECT user_id, business_name 
FROM partners 
WHERE user_id IS NOT NULL 
LIMIT 1;

-- Try to insert a test connection (replace USER_ID with result above)
INSERT INTO notification_preferences (user_id, telegram_chat_id, enable_telegram)
VALUES ('YOUR_USER_ID_HERE', '999999999', true)
ON CONFLICT (user_id) DO UPDATE 
SET telegram_chat_id = '999999999', enable_telegram = true;
```

If this fails, you'll see the exact error!

## Common Issues & Solutions

### Issue: "relation notification_preferences does not exist"
**Solution:** Run `FIX_TELEGRAM_CONNECTION_ERROR.sql`

### Issue: "violates foreign key constraint"
**Solution:** Run `FIX_TELEGRAM_CONNECTION_ERROR.sql` (fixes FK to auth.users)

### Issue: "row-level security policy"
**Solution:** Run `FIX_TELEGRAM_CONNECTION_ERROR.sql` (adds service role policy)

### Issue: "partner.user_id is NULL"
**Solution:** Partner account needs to be linked to auth user:
```sql
-- Check which partners have NULL user_id
SELECT id, business_name, user_id 
FROM partners 
WHERE user_id IS NULL;

-- If you find any, they need to be fixed manually
```

### Issue: Function shows "Unauthorized" in logs
**Solution:** Telegram webhook secret doesn't match. Check:
1. Environment variable `TELEGRAM_WEBHOOK_SECRET` in edge function
2. Should match what was set when registering webhook with Telegram

## Quick Debug Command

Run this in SQL Editor to see everything at once:

```sql
-- Check table exists
SELECT 'Table exists' as status WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'notification_preferences'
);

-- Check FK constraint
SELECT 
  tc.constraint_name,
  ccu.table_schema || '.' || ccu.table_name as references_table
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'notification_preferences' 
  AND tc.constraint_type = 'FOREIGN KEY';

-- Check RLS policies
SELECT policyname, roles 
FROM pg_policies 
WHERE tablename = 'notification_preferences';

-- Check sample partner data
SELECT id, user_id, business_name 
FROM partners 
LIMIT 3;
```

## Next Steps After Checking Logs

1. **If logs show FK error:** Run `FIX_TELEGRAM_CONNECTION_ERROR.sql`
2. **If logs show NULL user_id:** Fix partner accounts first
3. **If no errors but still failing:** Check environment variables
4. **If logs are empty:** Function might not be deployed or webhook not configured

## Need More Help?

Share the exact error message from the logs and I can provide specific fix!
