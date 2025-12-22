# Telegram Connection Error Troubleshooting Guide

## The Problem
Getting "❌ Error connecting your account" when connecting Telegram

## Root Cause Analysis

The error happens in the Telegram webhook when trying to save the connection. There are **3 possible causes**:

### 1. Wrong Foreign Key (Most Likely)
The `notification_preferences` table references `public.users(id)` but should reference `auth.users(id)`

**How to verify:**
Run [DIAGNOSE_TELEGRAM_ERROR.sql](DIAGNOSE_TELEGRAM_ERROR.sql) in Supabase SQL Editor

**How to fix:**
Run [FIX_TELEGRAM_CONNECTION_ERROR.sql](FIX_TELEGRAM_CONNECTION_ERROR.sql) in Supabase SQL Editor

### 2. Invalid User ID Being Sent
The partner's `user_id` might be NULL or invalid

**How to verify:**
```sql
SELECT id, user_id, business_name 
FROM partners 
WHERE user_id IS NULL OR user_id NOT IN (SELECT id FROM auth.users);
```

**How to fix:**
Partners must have a valid `user_id` that exists in `auth.users` table

### 3. RLS Policy Blocking Service Role
The webhook uses service role but RLS policies might be too restrictive

**How to verify:**
Check if service role policy exists:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'notification_preferences' 
AND policyname LIKE '%service%';
```

**How to fix:**
Run [FIX_TELEGRAM_CONNECTION_ERROR.sql](FIX_TELEGRAM_CONNECTION_ERROR.sql) which includes service role policy

## Step-by-Step Fix

### Step 1: Run Diagnostics
```bash
# In Supabase Dashboard > SQL Editor
# Copy and run: DIAGNOSE_TELEGRAM_ERROR.sql
```

This will show exactly what's wrong.

### Step 2: Fix the Database
```bash
# In Supabase Dashboard > SQL Editor
# Copy and run: FIX_TELEGRAM_CONNECTION_ERROR.sql
```

This will:
- Drop and recreate `notification_preferences` with correct FK
- Add service role policy for webhook
- Add proper indexes and RLS

### Step 3: Add Partner Notification Columns
```bash
# In Supabase Dashboard > SQL Editor
# Copy and run: ADD_NOTIFICATION_PREFERENCES_COLUMN.sql
```

This adds notification settings to partners table.

### Step 4: Test the Connection
1. Open partner dashboard
2. Click notifications icon (bell)
3. Toggle Telegram ON
4. Click the Telegram link
5. Click "Start" in Telegram bot
6. Should see: ✅ Success! Your SmartPick account is now connected

## How to Check Edge Function Logs

If still failing after the fixes:

1. Go to Supabase Dashboard
2. Click "Edge Functions" in left menu
3. Click "telegram-webhook"
4. Click "Logs" tab
5. Try connecting again
6. Check for errors in real-time

Look for:
- `Database error saving connection` - means FK constraint failed
- `Invalid user ID format detected` - means wrong user_id sent
- `Rate limit exceeded` - too many attempts

## Previous Working State

The system was working before with the same code. This suggests:
- Either the database was manually modified
- Or a migration was run that changed the FK
- Or the table was recreated incorrectly

The fix is to ensure `notification_preferences` has:
```sql
user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
```

Not:
```sql
user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE
```

## Testing After Fix

```sql
-- 1. Check FK is correct
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE table_name = 'notification_preferences';

-- 2. Verify you can insert (replace with your user_id)
INSERT INTO notification_preferences (user_id, telegram_chat_id, enable_telegram)
VALUES ('YOUR_USER_ID_HERE', '123456789', true)
ON CONFLICT (user_id) DO UPDATE SET telegram_chat_id = '123456789';

-- 3. Should succeed without error
```
