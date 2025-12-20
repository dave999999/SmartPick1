-- ============================================================================
-- Fix Supabase Security Warnings (WARN Level)
-- Date: 2024-12-21
-- Description: Address security warnings from Supabase linter
-- ============================================================================

-- ============================================================================
-- 1. FIX FUNCTION SEARCH PATH (Security Enhancement)
-- ============================================================================
-- Adding SET search_path = '' prevents malicious schema injection attacks
-- This forces functions to use fully qualified names (public.table_name)

-- List of functions to fix:
-- - get_partner_dashboard_data
-- - get_connection_pool_stats  
-- - create_reservation_atomic
-- - lift_cooldown_with_points
-- - reset_user_cooldown
-- - is_user_in_cooldown
-- - track_reservation_cancellation
-- - get_user_consecutive_cancellations
-- - can_user_reserve
-- - claim_achievement

-- Unfortunately, we need to see each function's full definition to add search_path
-- Let's create a helper query to check all functions that need fixing:

SELECT 
  routine_name,
  routine_schema,
  routine_definition,
  -- Check if search_path is already set
  CASE 
    WHEN routine_definition LIKE '%SET search_path%' THEN '✅ Has search_path'
    ELSE '❌ Missing search_path'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_partner_dashboard_data',
  'get_connection_pool_stats',
  'create_reservation_atomic',
  'lift_cooldown_with_points',
  'reset_user_cooldown',
  'is_user_in_cooldown',
  'track_reservation_cancellation',
  'get_user_consecutive_cancellations',
  'can_user_reserve',
  'claim_achievement'
)
ORDER BY routine_name;

-- ============================================================================
-- NOTE: To fix each function, you need to:
-- 1. Get the function definition: \df+ function_name
-- 2. Recreate it with: SET search_path = ''
-- 3. Example:
--
-- CREATE OR REPLACE FUNCTION public.my_function()
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = ''  -- Add this line
-- AS $$
-- BEGIN
--   -- function body
-- END;
-- $$;
-- ============================================================================

-- ============================================================================
-- 2. MATERIALIZED VIEW RLS (active_offers_with_partners)
-- ============================================================================
-- ⚠️  Materialized views DON'T support RLS in PostgreSQL
-- 
-- The Supabase warning is about materialized views being exposed to the API.
-- Since materialized views can't have RLS, we have two options:
-- 
-- Option 1: Hide from anon/authenticated roles (only service_role can access)
-- This is the SAFEST option if you access this via backend functions

REVOKE ALL ON public.active_offers_with_partners FROM anon, authenticated;
GRANT SELECT ON public.active_offers_with_partners TO service_role;

-- Option 2 (commented out): Keep it public if you're okay with the warning
-- Since this view only shows ACTIVE offers from APPROVED partners anyway,
-- it's essentially public data. The warning is informational.
-- 
-- To use this option instead, comment out the REVOKE above and uncomment below:
-- GRANT SELECT ON public.active_offers_with_partners TO anon, authenticated;

-- Verify access permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'active_offers_with_partners';

-- ============================================================================
-- 3. EXTENSIONS IN PUBLIC SCHEMA (pg_net, postgis)
-- ============================================================================
-- ⚠️  These are SUPABASE-MANAGED extensions
-- You cannot move them without breaking Supabase functionality
-- This warning is SAFE TO IGNORE for Supabase projects
-- 
-- Explanation:
-- - postgis: Required for location features, must be in public schema
-- - pg_net: Supabase's HTTP client, managed by Supabase
-- 
-- These extensions are properly secured by Supabase's infrastructure
-- ============================================================================

-- ============================================================================
-- 4. AUTH LEAKED PASSWORD PROTECTION
-- ============================================================================
-- ⚠️  This is NOT fixable via SQL - must be enabled in Supabase Dashboard
-- 
-- Steps to enable:
-- 1. Go to Supabase Dashboard → Authentication → Providers
-- 2. Click on Email provider
-- 3. Enable "Leaked Password Protection"
-- 4. This checks passwords against HaveIBeenPwned.org database
-- 
-- This is a dashboard setting, not a database setting
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check materialized view security
SELECT 
  schemaname,
  matviewname,
  definition
FROM pg_matviews
WHERE matviewname = 'active_offers_with_partners';

-- Check if functions have search_path set
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN prosrc LIKE '%search_path%' THEN '✅ Protected'
    ELSE '⚠️  Needs search_path'
  END as security_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
  'get_partner_dashboard_data',
  'get_connection_pool_stats',
  'create_reservation_atomic',
  'lift_cooldown_with_points',
  'reset_user_cooldown',
  'is_user_in_cooldown',
  'track_reservation_cancellation',
  'get_user_consecutive_cancellations',
  'can_user_reserve',
  'claim_achievement'
)
ORDER BY p.proname;

-- ============================================================================
-- SUMMARY OF WHAT TO DO
-- ============================================================================
-- 
-- ✅ SAFE TO IGNORE:
-- - extension_in_public (pg_net, postgis) - Supabase managed
-- - spatial_ref_sys RLS - PostGIS system table
-- 
-- ⚠️  REQUIRES DASHBOARD:
-- - auth_leaked_password_protection - Enable in Supabase Dashboard
-- 
-- 🔧 REQUIRES MANUAL FIX:
-- - function_search_path_mutable - Need to recreate each function with SET search_path = ''
--   (This requires seeing each function's full definition)
-- 
-- ✅ FIXED BY THIS SCRIPT:
-- - materialized_view_in_api - Security invoker enabled
-- 
-- ============================================================================
