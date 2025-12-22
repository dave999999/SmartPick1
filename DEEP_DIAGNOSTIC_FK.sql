-- DEEP DIAGNOSTIC: Why is FK still broken?

-- 1. Check if public.users table exists (it shouldn't!)
SELECT 
  'public.users table check' as test,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
    THEN '⚠️ public.users EXISTS - This is the problem!'
    ELSE '✅ public.users does NOT exist (correct)'
  END as result;

-- 2. Check if auth.users table exists (it should!)
SELECT 
  'auth.users table check' as test,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users')
    THEN '✅ auth.users EXISTS (correct)'
    ELSE '❌ auth.users does NOT exist - BIG PROBLEM!'
  END as result;

-- 3. Check if our user exists in auth.users
SELECT 
  'User in auth.users' as test,
  COUNT(*) as found,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ User EXISTS in auth.users'
    ELSE '❌ User NOT FOUND in auth.users'
  END as result
FROM auth.users 
WHERE id = '1b5f8b01-157b-4997-8f9b-411eec09b1c9';

-- 4. Show the ACTUAL FK definition
SELECT
  'Actual FK definition' as test,
  pg_get_constraintdef(oid) as fk_definition
FROM pg_constraint
WHERE conrelid = 'public.notification_preferences'::regclass
  AND contype = 'f';

-- 5. Check search_path
SELECT 
  'Current search_path' as test,
  current_setting('search_path') as value;

-- 6. Check what schema "users" resolves to
SELECT 
  'Schema resolution for "users"' as test,
  n.nspname as schema_name,
  CASE 
    WHEN n.nspname = 'auth' THEN '✅ Resolves to auth.users (correct)'
    WHEN n.nspname = 'public' THEN '❌ Resolves to public.users (WRONG!)'
    ELSE '⚠️ Unexpected schema: ' || n.nspname
  END as result
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'users'
  AND n.nspname IN ('public', 'auth')
ORDER BY 
  CASE WHEN n.nspname = 'public' THEN 1 ELSE 2 END;

-- FINAL RECOMMENDATION
SELECT 
  '🔍 DIAGNOSIS' as title,
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
    THEN 'There is a public.users table interfering! We need to use fully qualified FK or drop public.users'
    ELSE 'Check if notification_preferences table actually got recreated correctly'
  END as issue;
