-- =============================================
-- FIX 403 FORBIDDEN AUTH ERRORS
-- =============================================
-- Issue: GET /auth/v1/user returns 403 Forbidden
-- Cause: RLS policies blocking anonymous authentication checks
-- Solution: Allow Supabase Auth to verify user sessions
-- =============================================

-- This is a Supabase Auth endpoint issue, not a database RLS issue
-- The 403 error typically means one of these problems:

-- OPTION 1: Email confirmation is required but not configured
-- Go to: Supabase Dashboard → Authentication → Providers → Email
-- Action: Uncheck "Confirm email" to allow immediate login

-- OPTION 2: Anonymous key is disabled
-- Go to: Supabase Dashboard → Settings → API
-- Action: Ensure "anon" key is enabled and SUPABASE_ANON_KEY is correct in .env

-- OPTION 3: CORS is blocking the request
-- Go to: Supabase Dashboard → Authentication → URL Configuration
-- Action: Add your domain to "Site URL" and "Redirect URLs"

-- OPTION 4: Check if auth.users table has RLS blocking reads
-- This should NOT have RLS enabled (Supabase manages this internally)

-- Check if users table RLS is interfering with auth
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename IN ('users', 'auth_users')
  AND schemaname IN ('public', 'auth');

-- If public.users has RLS enabled, ensure it allows auth checks
-- (Note: auth.users in auth schema should NEVER have custom RLS)

-- =============================================
-- TEMPORARY FIX: Disable email confirmation requirement
-- =============================================
-- This SQL won't fix the auth endpoint directly, but can help identify the issue

-- Check current auth configuration
SELECT 
  'Email Confirmation Required' AS setting,
  (SELECT current_setting('app.settings.auth.enable_signup', true)) AS value
UNION ALL
SELECT 
  'SMTP Configured',
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_settings WHERE name LIKE '%smtp%'
  ) THEN 'Yes' ELSE 'No (Email confirmation will fail)' END;

-- =============================================
-- ACTION REQUIRED IN SUPABASE DASHBOARD:
-- =============================================
-- 1. Go to: Authentication → Providers → Email
-- 2. Scroll to "Confirm email" toggle
-- 3. DISABLE it (turn OFF) if you don't have SMTP configured
-- 4. Click "Save"
-- 
-- OR
--
-- 1. Go to: Settings → API
-- 2. Copy your "anon" public key
-- 3. Verify it matches VITE_SUPABASE_ANON_KEY in your .env file
--
-- =============================================

-- Additional diagnostic: Check if there are any custom auth hooks blocking requests
SELECT 
  'Custom Auth Hooks' AS check_type,
  COUNT(*) AS count
FROM pg_proc
WHERE proname LIKE '%auth%' 
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check for any banned IPs or rate limiting issues
-- (This requires checking Supabase Dashboard → Logs → Auth)

COMMENT ON SCHEMA public IS 'After fixing in Supabase Dashboard, restart your app and clear browser cache';
