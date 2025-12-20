-- COMPLETE FIX: Apply function fix + Clean up expired offers
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Update the viewport function
-- ============================================

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
BEGIN
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
    UPPER(o.status) = 'ACTIVE'
    AND o.quantity_available > 0
    AND o.expires_at > NOW()
    AND (o.pickup_end IS NULL OR o.pickup_end > NOW())  -- ✅ CRITICAL FIX
    AND UPPER(p.status) IN ('ACTIVE', 'APPROVED')
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

GRANT EXECUTE ON FUNCTION get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_offers_in_viewport(double precision, double precision, double precision, double precision, text, integer) TO anon;

-- ============================================
-- STEP 2: Mark expired offers as EXPIRED
-- ============================================

UPDATE offers
SET 
  status = 'EXPIRED',
  updated_at = NOW()
WHERE status = 'ACTIVE'
  AND pickup_end IS NOT NULL 
  AND pickup_end <= NOW();

-- Show how many were updated
SELECT 
  COUNT(*) as expired_offers_count,
  'Offers marked as EXPIRED due to ended pickup windows' as message
FROM offers
WHERE status = 'EXPIRED'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- ============================================
-- STEP 3: Verify the fix
-- ============================================

-- Count of truly active offers (should only show valid ones)
SELECT 
  COUNT(*) as active_offers_with_valid_pickup_windows
FROM offers
WHERE status = 'ACTIVE'
  AND quantity_available > 0
  AND expires_at > NOW()
  AND (pickup_end IS NULL OR pickup_end > NOW());

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 
  '✅ Fix Applied Successfully!' as status,
  'Refresh your browser (Ctrl+Shift+R) to see the changes' as next_step;
