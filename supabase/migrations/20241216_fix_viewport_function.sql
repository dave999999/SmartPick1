-- Fix get_offers_in_viewport function to match the API call signature
-- The function was overwritten with wrong parameter names in a previous migration

DROP FUNCTION IF EXISTS get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer);

CREATE OR REPLACE FUNCTION get_offers_in_viewport(
  p_north DOUBLE PRECISION,
  p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION,
  p_west DOUBLE PRECISION,
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  partner_id UUID,
  title VARCHAR(255),
  description VARCHAR(1000),
  category VARCHAR(100),
  images TEXT[],
  original_price NUMERIC,
  smart_price NUMERIC,
  quantity_available INT,
  quantity_total INT,
  pickup_start TIMESTAMPTZ,
  pickup_end TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status VARCHAR(50),
  created_at TIMESTAMPTZ,
  partner_name VARCHAR(255),
  partner_latitude DOUBLE PRECISION,
  partner_longitude DOUBLE PRECISION,
  partner_address VARCHAR(500),
  partner_phone VARCHAR(50),
  partner_business_type VARCHAR(100),
  partner_business_hours JSONB,
  distance_meters DOUBLE PRECISION
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
    p.business_name as partner_name,
    p.latitude as partner_latitude,
    p.longitude as partner_longitude,
    p.address as partner_address,
    p.phone as partner_phone,
    p.business_type as partner_business_type,
    p.business_hours as partner_business_hours,
    ST_Distance(
      p.location::geography,
      viewport_center
    ) as distance_meters
  FROM offers o
  INNER JOIN partners p ON o.partner_id = p.id
  WHERE 
    o.status = 'active'
    AND o.quantity_available > 0
    AND o.expires_at > NOW()
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.latitude >= p_south
    AND p.latitude <= p_north
    AND p.longitude >= p_west
    AND p.longitude <= p_east
    AND (p_category IS NULL OR o.category = p_category)
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer) TO anon;

-- Add comment
COMMENT ON FUNCTION get_offers_in_viewport IS 'Get active offers within map viewport bounds with partner details';
