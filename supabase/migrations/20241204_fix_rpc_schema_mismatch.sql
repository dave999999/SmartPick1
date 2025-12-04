-- =====================================================
-- CRITICAL FIX: RPC Schema Mismatch Resolution
-- =====================================================
-- Purpose: Fix parameter names and return types to match API expectations
-- Issue: Migration 20241204_fix_all_advisory_warnings.sql broke API compatibility
-- Created: 2024-12-04
-- =====================================================

-- ===============================================
-- STEP 1: Fix get_offers_in_viewport
-- ===============================================
-- Change parameter names back to match API (p_north/p_south/p_east/p_west)
-- Add ALL fields that API expects in response

DROP FUNCTION IF EXISTS get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer);

CREATE OR REPLACE FUNCTION get_offers_in_viewport(
  p_north double precision,
  p_south double precision,
  p_east double precision,
  p_west double precision,
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  -- Offer fields
  id uuid,
  partner_id uuid,
  title text,
  description text,
  category varchar(100),
  images text[],
  original_price numeric,
  smart_price numeric,
  quantity_available integer,
  quantity_total integer,
  pickup_start timestamptz,
  pickup_end timestamptz,
  expires_at timestamptz,
  status varchar(50),
  created_at timestamptz,
  -- Partner fields (flattened)
  partner_name varchar(255),
  partner_latitude double precision,
  partner_longitude double precision,
  partner_address varchar(500),
  partner_phone varchar(50),
  partner_business_type varchar(100),
  partner_business_hours jsonb,
  -- Computed fields
  distance_meters double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_center_lat double precision;
  v_center_lng double precision;
BEGIN
  -- Rate limiting
  PERFORM check_rate_limit('get_offers_in_viewport');
  
  -- Calculate viewport center for distance calculation
  v_center_lat := (p_north + p_south) / 2.0;
  v_center_lng := (p_east + p_west) / 2.0;
  
  RETURN QUERY
  SELECT 
    o.id,
    o.partner_id,
    o.title::text,
    o.description::text,
    o.category,
    o.images,
    o.original_price,
    o.smart_price,
    o.quantity_available,
    o.quantity_total,
    o.pickup_start,
    o.pickup_end,
    o.expires_at,
    o.status,
    o.created_at,
    p.business_name as partner_name,
    ST_Y(p.location::geometry) as partner_latitude,
    ST_X(p.location::geometry) as partner_longitude,
    p.address as partner_address,
    p.phone as partner_phone,
    p.business_type as partner_business_type,
    p.business_hours as partner_business_hours,
    ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(v_center_lng, v_center_lat), 4326)::geography
    ) as distance_meters
  FROM offers o
  INNER JOIN partners p ON o.partner_id = p.id
  WHERE o.status = 'ACTIVE'
    AND o.expires_at > NOW()
    AND o.quantity_available > 0
    AND ST_Intersects(
      p.location,
      ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
    )
    AND (p_category IS NULL OR o.category = p_category)
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_offers_in_viewport IS 
'Returns active offers within map viewport bounds with complete offer and partner data. Rate limited. Compatible with API expectations.';

-- ===============================================
-- STEP 2: Fix get_offers_near_location
-- ===============================================
-- Add ALL fields that API expects

DROP FUNCTION IF EXISTS get_offers_near_location(double precision, double precision, double precision, text, integer);

CREATE OR REPLACE FUNCTION get_offers_near_location(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters double precision DEFAULT 5000,
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  -- Offer fields
  id uuid,
  partner_id uuid,
  title text,
  description text,
  category varchar(100),
  images text[],
  original_price numeric,
  smart_price numeric,
  quantity_available integer,
  quantity_total integer,
  pickup_start timestamptz,
  pickup_end timestamptz,
  expires_at timestamptz,
  status varchar(50),
  created_at timestamptz,
  -- Partner fields (flattened)
  partner_name varchar(255),
  partner_latitude double precision,
  partner_longitude double precision,
  partner_address varchar(500),
  partner_phone varchar(50),
  partner_business_type varchar(100),
  partner_business_hours jsonb,
  -- Computed fields
  distance_meters double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Rate limiting
  PERFORM check_rate_limit('get_offers_near_location');
  
  RETURN QUERY
  SELECT 
    o.id,
    o.partner_id,
    o.title::text,
    o.description::text,
    o.category,
    o.images,
    o.original_price,
    o.smart_price,
    o.quantity_available,
    o.quantity_total,
    o.pickup_start,
    o.pickup_end,
    o.expires_at,
    o.status,
    o.created_at,
    p.business_name as partner_name,
    ST_Y(p.location::geometry) as partner_latitude,
    ST_X(p.location::geometry) as partner_longitude,
    p.address as partner_address,
    p.phone as partner_phone,
    p.business_type as partner_business_type,
    p.business_hours as partner_business_hours,
    ST_Distance(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) as distance_meters
  FROM offers o
  INNER JOIN partners p ON o.partner_id = p.id
  WHERE o.status = 'ACTIVE'
    AND o.expires_at > NOW()
    AND o.quantity_available > 0
    AND ST_DWithin(
      p.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters
    )
    AND (p_category IS NULL OR o.category = p_category)
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_offers_near_location IS 
'Returns active offers within radius of specified location with complete offer and partner data. Rate limited. Compatible with API expectations.';

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Test get_offers_in_viewport with Tbilisi bounds
SELECT 'Testing get_offers_in_viewport' as test;
SELECT 
  id, 
  title, 
  partner_name, 
  partner_latitude, 
  partner_longitude, 
  distance_meters,
  images IS NOT NULL as has_images,
  smart_price,
  quantity_total,
  expires_at IS NOT NULL as has_expires_at
FROM get_offers_in_viewport(
  41.8,  -- p_north
  41.6,  -- p_south
  44.9,  -- p_east
  44.7,  -- p_west
  NULL,  -- p_category
  10     -- p_limit
);

-- Test get_offers_near_location with Tbilisi center
SELECT 'Testing get_offers_near_location' as test;
SELECT 
  id, 
  title, 
  partner_name, 
  partner_latitude, 
  partner_longitude, 
  distance_meters,
  images IS NOT NULL as has_images,
  smart_price,
  quantity_total,
  expires_at IS NOT NULL as has_expires_at
FROM get_offers_near_location(
  41.7151,  -- p_latitude (Tbilisi)
  44.8271,  -- p_longitude
  5000,     -- p_radius_meters (5km)
  NULL,     -- p_category
  10        -- p_limit
);

-- Verify all expected fields are present
SELECT 'Checking return type completeness' as test;
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'get_offers_in_viewport'
ORDER BY ordinal_position;

-- Expected results:
-- ✅ Both queries should return offers with all fields populated
-- ✅ partner_latitude and partner_longitude should be numeric (not null)
-- ✅ images, smart_price, quantity_total, expires_at should exist
-- ✅ distance_meters should be calculated correctly
