-- =====================================================
-- CREATE get_offers_in_viewport RPC Function
-- =====================================================
-- Run this in Supabase SQL Editor to fix the 404 error
-- =====================================================

-- First, ensure PostGIS extension is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Recommendation: Add a spatial index for performance. This is critical.
-- This will dramatically speed up the ST_Intersects query.
CREATE INDEX IF NOT EXISTS partners_location_gist ON partners USING gist (location);

-- Drop existing function if it exists (needed if signature changed)
DROP FUNCTION IF EXISTS get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer) CASCADE;

-- Create the viewport function
CREATE OR REPLACE FUNCTION get_offers_in_viewport(
  p_north double precision,
  p_south double precision,
  p_east double precision,
  p_west double precision,
  p_category text DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  partner_id uuid,
  title varchar(255),
  description varchar(1000),
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
  partner_name varchar(255),
  partner_latitude double precision,
  partner_longitude double precision,
  partner_address varchar(500),
  partner_phone varchar(50),
  partner_business_type varchar(100),
  partner_business_hours jsonb,
  distance_meters double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewport_center geography;
BEGIN
  -- Calculate viewport center for distance calculation
  viewport_center := ST_SetSRID(
    ST_MakePoint((p_east + p_west) / 2, (p_north + p_south) / 2),
    4326
  )::geography;

  RETURN QUERY
  SELECT 
    o.id,
    o.partner_id,
    o.title,
    o.description,
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
    CAST(p.business_name AS VARCHAR(255)) as partner_name,
    CAST(p.latitude AS DOUBLE PRECISION) as partner_latitude,
    CAST(p.longitude AS DOUBLE PRECISION) as partner_longitude,
    CAST(p.address AS VARCHAR(500)) as partner_address,
    CAST(p.phone AS VARCHAR(50)) as partner_phone,
    CAST(p.business_type AS VARCHAR(100)) as partner_business_type,
    p.business_hours as partner_business_hours,
    CASE 
      WHEN p.location IS NOT NULL THEN 
        ST_Distance(p.location, viewport_center)
      WHEN p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN 
        ST_Distance(
          ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography,
          viewport_center
        )
      ELSE NULL
    END as distance_meters
  FROM offers o
  INNER JOIN partners p ON o.partner_id = p.id
  WHERE o.status = 'ACTIVE'
    AND o.quantity_available > 0
    AND o.expires_at > NOW()
    AND (
      -- Use spatial index if location column exists
      (p.location IS NOT NULL AND ST_Intersects(
        p.location::geometry,
        ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
      ))
      OR
      -- Fallback to lat/lng columns
      (p.location IS NULL AND 
       p.latitude BETWEEN p_south AND p_north AND
       p.longitude BETWEEN p_west AND p_east)
    )
    AND (p_category IS NULL OR o.category = p_category)
  ORDER BY distance_meters ASC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer) TO anon;

-- Test the function
SELECT COUNT(*) as offer_count
FROM get_offers_in_viewport(40.0, 43.0, 42.0, 45.0, NULL, 100);

COMMENT ON FUNCTION get_offers_in_viewport IS 'Returns active offers within a geographic viewport/bounding box for map display';
