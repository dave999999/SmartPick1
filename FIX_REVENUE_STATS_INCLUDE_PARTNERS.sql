-- ============================================================================
-- FIX: Include partner point purchases in platform revenue stats
-- ============================================================================
-- Problem: get_platform_revenue_stats only queries point_transactions (customers)
-- Solution: Also include partner_point_transactions (partners buying points)
-- ============================================================================

DROP FUNCTION IF EXISTS get_platform_revenue_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION get_platform_revenue_stats(
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  total_revenue DECIMAL,
  total_point_purchases BIGINT,
  total_points_sold BIGINT,
  average_purchase_value DECIMAL,
  unique_buyers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH customer_purchases AS (
    SELECT
      pt.user_id,
      pt.change,
      pt.created_at
    FROM public.point_transactions pt
    WHERE pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
      AND pt.change > 0
      AND pt.created_at >= p_start_date
      AND pt.created_at <= p_end_date
  ),
  partner_purchases AS (
    SELECT
      ppt.partner_id as user_id,
      ppt.change,
      ppt.created_at
    FROM public.partner_point_transactions ppt
    WHERE ppt.reason IN ('PURCHASE', 'purchase', 'POINTS_PURCHASED')
      AND ppt.change > 0
      AND ppt.created_at >= p_start_date
      AND ppt.created_at <= p_end_date
  ),
  all_purchases AS (
    SELECT * FROM customer_purchases
    UNION ALL
    SELECT * FROM partner_purchases
  )
  SELECT
    -- Convert points to GEL (100 points = 1 GEL)
    (COALESCE(SUM(change), 0) / 100.0)::DECIMAL AS total_revenue,
    COUNT(*)::BIGINT AS total_point_purchases,
    COALESCE(SUM(change), 0)::BIGINT AS total_points_sold,
    -- Average in GEL
    (COALESCE(AVG(change), 0) / 100.0)::DECIMAL AS average_purchase_value,
    COUNT(DISTINCT user_id)::BIGINT AS unique_buyers
  FROM all_purchases;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_platform_revenue_stats IS 
'Returns platform revenue from ALL point purchases (both customer and partner purchases combined)';

GRANT EXECUTE ON FUNCTION get_platform_revenue_stats TO authenticated;

-- Also fix getDailyRevenueSummary if it exists
DROP FUNCTION IF EXISTS get_daily_revenue_summary(INTEGER);

CREATE OR REPLACE FUNCTION get_daily_revenue_summary(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  total_purchases INTEGER,
  points_sold INTEGER,
  revenue_gel DECIMAL,
  unique_buyers INTEGER,
  buyer_names TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH customer_purchases AS (
    SELECT
      pt.user_id,
      u.name::TEXT as buyer_name,
      pt.change,
      DATE(pt.created_at) as purchase_date
    FROM public.point_transactions pt
    JOIN public.users u ON u.id = pt.user_id
    WHERE pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
      AND pt.change > 0
      AND pt.created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ),
  partner_purchases AS (
    SELECT
      ppt.partner_id as user_id,
      p.business_name::TEXT as buyer_name,
      ppt.change,
      DATE(ppt.created_at) as purchase_date
    FROM public.partner_point_transactions ppt
    JOIN public.partners p ON p.id = ppt.partner_id
    WHERE ppt.reason IN ('PURCHASE', 'purchase', 'POINTS_PURCHASED')
      AND ppt.change > 0
      AND ppt.created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ),
  all_purchases AS (
    SELECT * FROM customer_purchases
    UNION ALL
    SELECT * FROM partner_purchases
  )
  SELECT
    purchase_date::DATE as date,
    COUNT(*)::INTEGER as total_purchases,
    COALESCE(SUM(change), 0)::INTEGER as points_sold,
    (COALESCE(SUM(change), 0) / 100.0)::DECIMAL as revenue_gel,
    COUNT(DISTINCT user_id)::INTEGER as unique_buyers,
    STRING_AGG(DISTINCT buyer_name, ', ' ORDER BY buyer_name)::TEXT as buyer_names
  FROM all_purchases
  GROUP BY purchase_date
  ORDER BY purchase_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_daily_revenue_summary IS 
'Returns daily revenue summary from ALL point purchases (customers + partners)';

GRANT EXECUTE ON FUNCTION get_daily_revenue_summary TO authenticated;

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Fixed platform revenue stats functions';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated functions now include:';
  RAISE NOTICE '  ✅ Customer point purchases (point_transactions)';
  RAISE NOTICE '  ✅ Partner point purchases (partner_point_transactions)';
  RAISE NOTICE '';
  RAISE NOTICE 'Refresh the Finance tab in admin dashboard to see all purchases!';
  RAISE NOTICE '============================================================';
END $$;
