-- Add business hours filtering to offers queries
-- This ensures offers from scheduled businesses only show during operating hours

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
  description TEXT,
  category VARCHAR(50),
  images TEXT[],
  original_price NUMERIC,
  smart_price NUMERIC,
  quantity_available INT,
  quantity_total INT,
  pickup_start TIMESTAMPTZ,
  pickup_end TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status VARCHAR(20),
  created_at TIMESTAMPTZ,
  partner_name VARCHAR(255),
  partner_latitude NUMERIC(10,8),
  partner_longitude NUMERIC(11,8),
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
  current_time_only TIME;
BEGIN
  -- Calculate viewport center for distance calculation
  viewport_center := ST_SetSRID(
    ST_MakePoint((p_east + p_west) / 2, (p_north + p_south) / 2),
    4326
  )::geography;

  -- Get current time (without date) for business hours comparison
  current_time_only := NOW()::TIME;

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
    UPPER(o.status) = 'ACTIVE'
    AND o.quantity_available > 0
    AND o.expires_at > NOW()
    AND (o.pickup_end IS NULL OR o.pickup_end > NOW())
    AND UPPER(p.status) IN ('ACTIVE', 'APPROVED')
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.latitude >= p_south
    AND p.latitude <= p_north
    AND p.longitude >= p_west
    AND p.longitude <= p_east
    AND (p_category IS NULL OR o.category = p_category)
    -- ✅ NEW: Business hours filtering
    -- If business is 24/7 (is_24_7 = true OR open_24h = true), always show
    -- Otherwise, only show if current time is within business hours
    AND (
      COALESCE((p.business_hours->>'is_24_7')::BOOLEAN, p.open_24h, FALSE) = TRUE
      OR (
        current_time_only >= COALESCE((p.business_hours->>'open')::TIME, '00:00'::TIME)
        AND current_time_only <= COALESCE((p.business_hours->>'close')::TIME, '23:59'::TIME)
      )
    )
  ORDER BY distance_meters ASC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer) TO anon;

-- Comment
COMMENT ON FUNCTION get_offers_in_viewport IS 'Get active offers within map viewport bounds - filters by expiration AND business hours. Scheduled businesses only show offers during operating hours.';
