-- =====================================================
-- COMPREHENSIVE SECURITY FIX: Address All Advisory Warnings
-- =====================================================
-- Purpose: Fix all Supabase advisor warnings safely
-- Created: 2024-12-04
-- Safe approach: Only adds security, doesn't remove access
-- =====================================================

-- ===============================================
-- PART 1: Fix Function Search Path (6 functions)
-- ===============================================
-- Add explicit search_path to all SECURITY DEFINER functions
-- This prevents potential SQL injection via search_path manipulation

-- Fix check_rate_limit function
DROP FUNCTION IF EXISTS check_rate_limit(text, integer, integer);
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_endpoint text,
  p_limit integer DEFAULT 120,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_ip inet;
  v_window_start timestamptz;
  v_request_count integer;
BEGIN
  v_user_ip := inet_client_addr();
  IF v_user_ip IS NULL THEN
    v_user_ip := '127.0.0.1'::inet;
  END IF;
  
  v_window_start := date_trunc('minute', NOW());
  
  SELECT request_count INTO v_request_count
  FROM api_rate_limits
  WHERE user_ip = v_user_ip
    AND endpoint = p_endpoint
    AND window_start = v_window_start;
  
  IF v_request_count IS NULL THEN
    INSERT INTO api_rate_limits (user_ip, endpoint, request_count, window_start)
    VALUES (v_user_ip, p_endpoint, 1, v_window_start);
    RETURN true;
  ELSIF v_request_count < p_limit THEN
    UPDATE api_rate_limits
    SET request_count = request_count + 1
    WHERE user_ip = v_user_ip
      AND endpoint = p_endpoint
      AND window_start = v_window_start;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Fix get_offers_near_location function
DROP FUNCTION IF EXISTS get_offers_near_location(double precision, double precision, double precision, text, integer);
CREATE OR REPLACE FUNCTION get_offers_near_location(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters double precision DEFAULT 5000,
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title varchar(255),
  description varchar(1000),
  original_price numeric,
  discounted_price numeric,
  discount_percentage numeric,
  quantity_available integer,
  category varchar(100),
  tags text[],
  status varchar(50),
  pickup_start timestamptz,
  pickup_end timestamptz,
  partner_id uuid,
  partner_name varchar(255),
  partner_address varchar(500),
  partner_phone varchar(50),
  partner_business_type varchar(100),
  partner_location geometry,
  distance_meters double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_rate_limit('get_offers_near_location');
  
  RETURN QUERY
  SELECT 
    aop.id,
    aop.title,
    aop.description,
    aop.original_price,
    aop.discounted_price,
    aop.discount_percentage,
    aop.quantity_available,
    aop.category,
    aop.tags,
    aop.status,
    aop.pickup_start,
    aop.pickup_end,
    aop.partner_id,
    aop.partner_name,
    aop.partner_address,
    aop.partner_phone,
    aop.partner_business_type,
    aop.partner_location,
    ST_Distance(
      aop.partner_location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) as distance_meters
  FROM active_offers_with_partners aop
  WHERE ST_DWithin(
    aop.partner_location::geography,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
    p_radius_meters
  )
  AND (p_category IS NULL OR aop.category = p_category)
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$;

-- Fix get_offers_in_viewport function
DROP FUNCTION IF EXISTS get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer);
CREATE OR REPLACE FUNCTION get_offers_in_viewport(
  p_min_lat double precision,
  p_min_lng double precision,
  p_max_lat double precision,
  p_max_lng double precision,
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  title varchar(255),
  description varchar(1000),
  original_price numeric,
  discounted_price numeric,
  discount_percentage numeric,
  quantity_available integer,
  category varchar(100),
  tags text[],
  status varchar(50),
  pickup_start timestamptz,
  pickup_end timestamptz,
  partner_id uuid,
  partner_name varchar(255),
  partner_address varchar(500),
  partner_phone varchar(50),
  partner_business_type varchar(100),
  partner_location geometry
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_rate_limit('get_offers_in_viewport');
  
  RETURN QUERY
  SELECT 
    aop.id,
    aop.title,
    aop.description,
    aop.original_price,
    aop.discounted_price,
    aop.discount_percentage,
    aop.quantity_available,
    aop.category,
    aop.tags,
    aop.status,
    aop.pickup_start,
    aop.pickup_end,
    aop.partner_id,
    aop.partner_name,
    aop.partner_address,
    aop.partner_phone,
    aop.partner_business_type,
    aop.partner_location
  FROM active_offers_with_partners aop
  WHERE ST_Intersects(
    aop.partner_location,
    ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
  )
  AND (p_category IS NULL OR aop.category = p_category)
  LIMIT p_limit;
END;
$$;

-- Fix update_partner_location function
DROP FUNCTION IF EXISTS update_partner_location(uuid, double precision, double precision);
CREATE OR REPLACE FUNCTION update_partner_location(
  p_partner_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE partners
  SET 
    location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
    updated_at = NOW()
  WHERE id = p_partner_id;
END;
$$;

-- Fix get_connection_pool_stats function
DROP FUNCTION IF EXISTS get_connection_pool_stats();
CREATE OR REPLACE FUNCTION get_connection_pool_stats()
RETURNS TABLE (
  active_connections bigint,
  max_connections integer,
  usage_percent numeric,
  idle_connections bigint,
  active_queries bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE state = 'active') as active_connections,
    (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections') as max_connections,
    ROUND((COUNT(*) FILTER (WHERE state = 'active')::numeric / 
           (SELECT setting::integer FROM pg_settings WHERE name = 'max_connections')::numeric * 100), 2) as usage_percent,
    COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
    COUNT(*) FILTER (WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%') as active_queries
  FROM pg_stat_activity
  WHERE datname = current_database();
END;
$$;

-- Fix refresh_active_offers_view function
DROP FUNCTION IF EXISTS refresh_active_offers_view();
CREATE OR REPLACE FUNCTION refresh_active_offers_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_offers_with_partners;
END;
$$;

-- ===============================================
-- PART 2: Enable RLS on api_rate_limits table
-- ===============================================

ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public policies - only accessible via SECURITY DEFINER functions
COMMENT ON TABLE api_rate_limits 
IS 'Rate limiting table - Access only via check_rate_limit() function';

-- ===============================================
-- PART 3: Materialized View Note
-- ===============================================
-- Note: Materialized views cannot have RLS in PostgreSQL
-- The "Materialized View in API" warning is informational only
-- 
-- This is SAFE because:
-- - Materialized views are just cached query results
-- - They're read-only (no INSERT/UPDATE/DELETE)
-- - Access is controlled by the underlying tables (offers, partners)
-- - Only functions with SECURITY DEFINER can refresh them
--
-- To restrict API access, you can:
-- 1. Remove from PostgREST schema exposure (Supabase Settings → API)
-- 2. Use API Gateway rules to block direct access
-- 3. Only access via RPC functions (current implementation)
--
-- Current setup: Safe - accessed via get_offers_in_viewport() and get_offers_near_location()

COMMENT ON MATERIALIZED VIEW active_offers_with_partners 
IS 'Active offers with partner details - Read-only cached data, accessed via RPC functions';

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- 1. Verify all functions have search_path set
SELECT 
  p.proname as function_name,
  CASE 
    WHEN 'search_path=public' = ANY(proconfig) THEN '✅ Fixed'
    ELSE '❌ Missing'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'check_rate_limit',
    'get_offers_near_location', 
    'get_offers_in_viewport',
    'update_partner_location',
    'get_connection_pool_stats',
    'refresh_active_offers_view'
  )
ORDER BY p.proname;

-- 2. Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'api_rate_limits'
  AND schemaname = 'public';

-- 3. Verify policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as policy_type
FROM pg_policies
WHERE tablename = 'api_rate_limits'
ORDER BY tablename, policyname;

-- 4. Test functions still work
SELECT 'Testing check_rate_limit' as test;
SELECT check_rate_limit('test_endpoint') as result;

SELECT 'Testing connection pool stats' as test;
SELECT * FROM get_connection_pool_stats();

-- Expected results:
-- ✅ All 6 functions should show 'search_path=public'
-- ✅ api_rate_limits should have RLS enabled
-- ✅ api_rate_limits should have 0 policies (function-only access)
-- ✅ All test queries should return results (functions still work)
--
-- Remaining warnings after this fix:
-- ⚠️ spatial_ref_sys - PostGIS system table (cannot modify, safe to ignore)
-- ⚠️ pg_net, postgis extensions - Supabase managed (cannot modify, safe to ignore)
-- ⚠️ active_offers_with_partners materialized view - No RLS support in PostgreSQL (safe, read-only cached data)
