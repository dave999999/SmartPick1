-- Diagnostic script to find why Telegram connection is failing
-- Run this to check database state and identify the issue

-- Step 1: Check if notification_preferences table exists
SELECT 
  'notification_preferences table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'notification_preferences'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run FIX_TELEGRAM_CONNECTION_ERROR.sql first!'
  END as status;

-- Step 2: Check the foreign key constraint
SELECT
  'Foreign Key Check' as check_name,
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  CASE 
    WHEN ccu.table_name = 'users' AND ccu.table_schema = 'auth' THEN '✅ CORRECT (auth.users)'
    WHEN ccu.table_name = 'users' AND ccu.table_schema = 'public' THEN '❌ WRONG (public.users) - Run FIX_TELEGRAM_CONNECTION_ERROR.sql!'
    ELSE '⚠️ UNEXPECTED'
  END as fk_status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'notification_preferences'
  AND kcu.column_name = 'user_id';

-- Step 3: Check if auth.users table exists (it should!)
SELECT 
  'auth.users table' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'auth' 
      AND table_name = 'users'
    ) THEN '✅ EXISTS'
    ELSE '❌ CRITICAL ERROR: auth.users missing!'
  END as status;

-- Step 4: Check RLS policies
SELECT
  'RLS Policies' as check_name,
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN roles = '{service_role}' THEN '✅ Service role policy exists'
    ELSE '⚠️ ' || array_to_string(roles, ', ')
  END as policy_info
FROM pg_policies
WHERE tablename = 'notification_preferences'
ORDER BY policyname;

-- Step 5: Try to find a sample user_id from partners table
SELECT
  'Sample Test Data' as check_name,
  p.id as partner_id,
  p.user_id,
  p.business_name,
  CASE 
    WHEN p.user_id IS NULL THEN '❌ NULL user_id - partner not linked to auth user!'
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = p.user_id) THEN '✅ Valid user_id in auth.users'
    ELSE '❌ user_id not found in auth.users!'
  END as user_id_status
FROM partners p
LIMIT 5;

-- Step 6: Check existing connections
SELECT
  'Existing Connections' as check_name,
  COUNT(*) as total_connections,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT telegram_chat_id) as unique_chats
FROM notification_preferences
WHERE enable_telegram = true;

-- Final recommendation
SELECT 
  '🔧 NEXT STEPS' as recommendation,
  CASE 
    WHEN NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_preferences')
    THEN '1️⃣ Run FIX_TELEGRAM_CONNECTION_ERROR.sql to create the table'
    
    WHEN EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage 
      WHERE table_name = 'users' AND table_schema = 'public' 
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_name = 'notification_preferences' AND constraint_type = 'FOREIGN KEY'
      )
    )
    THEN '2️⃣ CRITICAL: Run FIX_TELEGRAM_CONNECTION_ERROR.sql - FK points to wrong table (public.users instead of auth.users)'
    
    ELSE '3️⃣ Check if there are any errors in the Supabase edge function logs'
  END as action;
