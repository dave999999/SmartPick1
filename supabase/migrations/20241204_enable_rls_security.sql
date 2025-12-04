-- =====================================================
-- SECURITY FIX: Enable RLS on Missing Tables
-- =====================================================
-- Purpose: Enable Row-Level Security on tables exposed to PostgREST
-- Created: 2024-12-04
-- =====================================================

-- ===============================================
-- STEP 1: Skip spatial_ref_sys (PostGIS system table)
-- ===============================================
-- Note: spatial_ref_sys is owned by PostGIS extension and cannot be modified
-- The RLS warning can be safely ignored - it's a read-only reference table
-- managed by PostGIS and not directly accessible via your app

-- ===============================================
-- STEP 2: Enable RLS on api_rate_limits
-- ===============================================
-- This table should only be accessible by functions, not directly by users

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public policies - only accessible via SECURITY DEFINER functions
-- This prevents users from viewing or manipulating rate limit data directly

COMMENT ON TABLE api_rate_limits 
IS 'Rate limiting table - No direct access, only via check_rate_limit() function';

-- ===============================================
-- VERIFICATION
-- ===============================================

-- Check RLS is enabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'api_rate_limits'
  AND schemaname = 'public';
-- Expected: api_rate_limits should show rls_enabled = true

-- Check policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as policy_type,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'api_rate_limits';
-- Expected: 0 policies (function-only access via SECURITY DEFINER)
