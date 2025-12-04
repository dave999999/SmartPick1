-- =====================================================
-- RATE LIMITING: Protect RPC Functions from Abuse
-- =====================================================
-- Purpose: Prevent DDoS attacks and malicious usage
-- Created: 2024-12-04
-- =====================================================

-- ===============================================
-- STEP 1: Create Rate Limiting Table
-- ===============================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_ip inet NOT NULL,
  endpoint text NOT NULL,
  request_count integer DEFAULT 0,
  window_start timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON api_rate_limits (user_ip, endpoint, window_start);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_created
ON api_rate_limits (created_at);

COMMENT ON TABLE api_rate_limits IS 'Rate limiting tracking for API endpoints';
COMMENT ON COLUMN api_rate_limits.user_ip IS 'Client IP address from inet_client_addr()';
COMMENT ON COLUMN api_rate_limits.endpoint IS 'API endpoint name (e.g., get_offers_in_viewport)';
COMMENT ON COLUMN api_rate_limits.request_count IS 'Number of requests in current window';
COMMENT ON COLUMN api_rate_limits.window_start IS 'Start time of current rate limit window';

-- ===============================================
-- STEP 2: Rate Limit Check Function
-- ===============================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_endpoint text,
  p_limit integer DEFAULT 120,  -- 120 requests
  p_window_seconds integer DEFAULT 60  -- per minute
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_ip inet;
  v_count integer;
  v_window_start timestamptz;
BEGIN
  -- Get client IP from request
  v_user_ip := inet_client_addr();
  
  -- If IP is null (local/internal request), allow it
  IF v_user_ip IS NULL THEN
    RETURN true;
  END IF;
  
  -- Clean old windows (older than 1 hour)
  DELETE FROM api_rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
  
  -- Check current window
  SELECT request_count, window_start INTO v_count, v_window_start
  FROM api_rate_limits
  WHERE user_ip = v_user_ip
    AND endpoint = p_endpoint
    AND window_start > NOW() - (p_window_seconds || ' seconds')::interval
  ORDER BY window_start DESC
  LIMIT 1;
  
  IF v_count IS NULL THEN
    -- First request in window - create new entry
    INSERT INTO api_rate_limits (user_ip, endpoint, request_count, window_start)
    VALUES (v_user_ip, p_endpoint, 1, NOW());
    RETURN true;
  ELSIF v_count >= p_limit THEN
    -- Rate limit exceeded
    RAISE EXCEPTION 'Rate limit exceeded for %. Max % requests per % seconds', 
      p_endpoint, p_limit, p_window_seconds
      USING HINT = 'Please wait before making more requests';
    RETURN false;
  ELSE
    -- Increment counter
    UPDATE api_rate_limits
    SET request_count = request_count + 1
    WHERE user_ip = v_user_ip 
      AND endpoint = p_endpoint
      AND window_start = v_window_start;
    RETURN true;
  END IF;
END;
$$;

COMMENT ON FUNCTION check_rate_limit IS 'Check if rate limit is exceeded for an endpoint. Returns true if allowed, raises exception if exceeded.';

-- ===============================================
-- STEP 3: Update get_offers_in_viewport with Rate Limiting
-- ===============================================

-- Drop existing function to allow signature change
DROP FUNCTION IF EXISTS get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer);

CREATE OR REPLACE FUNCTION get_offers_in_viewport(
  north double precision,
  south double precision,
  east double precision,
  west double precision,
  filter_category text DEFAULT NULL,
  result_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  title varchar(255),
  description varchar(1000),
  category varchar(100),
  status varchar(50),
  smart_price numeric,
  original_price numeric,
  quantity_available integer,
  pickup_start timestamptz,
  pickup_end timestamptz,
  expires_at timestamptz,
  partner_id uuid,
  partner_name varchar(255),
  partner_address varchar(500),
  partner_phone varchar(50),
  partner_business_type varchar(100),
  partner_latitude double precision,
  partner_longitude double precision,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Rate limit check: 120 requests per minute
  PERFORM check_rate_limit('get_offers_in_viewport', 120, 60);
  
  -- Original query logic
  RETURN QUERY
  SELECT 
    aop.id,
    aop.title,
    aop.description,
    aop.category,
    aop.status,
    aop.smart_price,
    aop.original_price,
    aop.quantity_available,
    aop.pickup_start,
    aop.pickup_end,
    aop.expires_at,
    aop.partner_id,
    aop.partner_name,
    aop.partner_address,
    aop.partner_phone,
    aop.partner_business_type,
    aop.partner_latitude,
    aop.partner_longitude,
    aop.created_at
  FROM active_offers_with_partners aop
  WHERE aop.partner_latitude BETWEEN south AND north
    AND aop.partner_longitude BETWEEN west AND east
    AND (filter_category IS NULL OR aop.category = filter_category)
    AND aop.status = 'ACTIVE'
    AND aop.expires_at > NOW()
  ORDER BY aop.created_at DESC
  LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION get_offers_in_viewport IS 'Get active offers within viewport bounds with rate limiting (120 req/min)';

-- ===============================================
-- STEP 4: Update get_offers_near_location with Rate Limiting
-- ===============================================

-- Drop existing function to allow signature change
DROP FUNCTION IF EXISTS get_offers_near_location(double precision, double precision, integer, text, integer);

CREATE OR REPLACE FUNCTION get_offers_near_location(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters integer DEFAULT 5000,
  filter_category text DEFAULT NULL,
  result_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  title varchar(255),
  description varchar(1000),
  category varchar(100),
  status varchar(50),
  smart_price numeric,
  original_price numeric,
  quantity_available integer,
  pickup_start timestamptz,
  pickup_end timestamptz,
  expires_at timestamptz,
  partner_id uuid,
  partner_name varchar(255),
  partner_address varchar(500),
  partner_phone varchar(50),
  partner_business_type varchar(100),
  partner_latitude double precision,
  partner_longitude double precision,
  distance_meters double precision,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Rate limit check: 120 requests per minute
  PERFORM check_rate_limit('get_offers_near_location', 120, 60);
  
  -- Original query logic with spatial distance calculation
  RETURN QUERY
  SELECT 
    aop.id,
    aop.title,
    aop.description,
    aop.category,
    aop.status,
    aop.smart_price,
    aop.original_price,
    aop.quantity_available,
    aop.pickup_start,
    aop.pickup_end,
    aop.expires_at,
    aop.partner_id,
    aop.partner_name,
    aop.partner_address,
    aop.partner_phone,
    aop.partner_business_type,
    aop.partner_latitude,
    aop.partner_longitude,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(aop.partner_longitude, aop.partner_latitude), 4326)::geography
    ) as distance_meters,
    aop.created_at
  FROM active_offers_with_partners aop
  WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      ST_SetSRID(ST_MakePoint(aop.partner_longitude, aop.partner_latitude), 4326)::geography,
      p_radius_meters
    )
    AND (filter_category IS NULL OR aop.category = filter_category)
    AND aop.status = 'ACTIVE'
    AND aop.expires_at > NOW()
  ORDER BY distance_meters ASC
  LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION get_offers_near_location IS 'Get active offers near a location with rate limiting (120 req/min)';

-- ===============================================
-- STEP 5: Automatic Cleanup Job (Optional)
-- ===============================================
-- Clean up old rate limit records every hour using pg_cron

-- Only create if pg_cron is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if it exists (ignore error if doesn't exist)
    BEGIN
      PERFORM cron.unschedule('cleanup-rate-limits');
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
    
    -- Schedule cleanup every hour
    PERFORM cron.schedule(
      'cleanup-rate-limits',
      '0 * * * *',  -- Every hour
      'DELETE FROM api_rate_limits WHERE created_at < NOW() - INTERVAL ''2 hours'''
    );
  END IF;
END $$;

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Check rate limit table structure
-- SELECT * FROM api_rate_limits LIMIT 10;

-- Test rate limiting function (should succeed first 120 times, then fail)
-- SELECT check_rate_limit('test_endpoint', 120, 60);

-- View current rate limits by IP
-- SELECT user_ip, endpoint, request_count, window_start 
-- FROM api_rate_limits 
-- WHERE window_start > NOW() - INTERVAL '5 minutes'
-- ORDER BY window_start DESC;

-- Test viewport function with rate limiting
-- SELECT COUNT(*) FROM get_offers_in_viewport(41.8, 41.6, 44.9, 44.7, NULL, 10);
