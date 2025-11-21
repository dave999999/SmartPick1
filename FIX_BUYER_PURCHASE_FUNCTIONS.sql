-- ============================================================================
-- FIX: Create/update buyer purchase details function to include partners
-- ============================================================================
-- Problem: get_buyer_purchase_details doesn't include partner purchases
-- Solution: Create function that combines both customer and partner purchases
-- ============================================================================

DROP FUNCTION IF EXISTS get_buyer_purchase_details(UUID);

CREATE OR REPLACE FUNCTION get_buyer_purchase_details(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  purchase_date TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_type TEXT,
  points_purchased INTEGER,
  amount_paid_gel DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH customer_purchases AS (
    SELECT
      pt.created_at as purchase_date,
      pt.user_id,
      u.name::TEXT as user_name,
      u.email::TEXT as user_email,
      'Customer'::TEXT as user_type,
      pt.change as points_purchased,
      (pt.change / 100.0)::DECIMAL as amount_paid_gel
    FROM public.point_transactions pt
    JOIN public.users u ON u.id = pt.user_id
    WHERE pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
      AND pt.change > 0
      AND (p_user_id IS NULL OR pt.user_id = p_user_id)
  ),
  partner_purchases AS (
    SELECT
      ppt.created_at as purchase_date,
      ppt.partner_id as user_id,
      p.business_name::TEXT as user_name,
      p.email::TEXT as user_email,
      'Partner'::TEXT as user_type,
      ppt.change as points_purchased,
      (ppt.change / 100.0)::DECIMAL as amount_paid_gel
    FROM public.partner_point_transactions ppt
    JOIN public.partners p ON p.id = ppt.partner_id
    WHERE ppt.reason IN ('PURCHASE', 'purchase', 'POINTS_PURCHASED')
      AND ppt.change > 0
      AND (p_user_id IS NULL OR ppt.partner_id = p_user_id)
  )
  SELECT * FROM customer_purchases
  UNION ALL
  SELECT * FROM partner_purchases
  ORDER BY purchase_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_buyer_purchase_details IS 
'Returns detailed purchase history for all buyers (customers + partners)';

GRANT EXECUTE ON FUNCTION get_buyer_purchase_details TO authenticated;

-- Also create/update get_top_point_buyers to include partners
DROP FUNCTION IF EXISTS get_top_point_buyers(INTEGER, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION get_top_point_buyers(
  p_limit INTEGER DEFAULT 10,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_type TEXT,
  total_points_purchased INTEGER,
  total_spent_gel DECIMAL,
  purchase_count INTEGER,
  first_purchase TIMESTAMP WITH TIME ZONE,
  last_purchase TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH customer_purchases AS (
    SELECT
      pt.user_id,
      u.name::TEXT as user_name,
      u.email::TEXT as user_email,
      'Customer'::TEXT as user_type,
      pt.change,
      pt.created_at
    FROM public.point_transactions pt
    JOIN public.users u ON u.id = pt.user_id
    WHERE pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
      AND pt.change > 0
      AND (p_start_date IS NULL OR pt.created_at >= p_start_date)
      AND (p_end_date IS NULL OR pt.created_at <= p_end_date)
  ),
  partner_purchases AS (
    SELECT
      ppt.partner_id as user_id,
      p.business_name::TEXT as user_name,
      p.email::TEXT as user_email,
      'Partner'::TEXT as user_type,
      ppt.change,
      ppt.created_at
    FROM public.partner_point_transactions ppt
    JOIN public.partners p ON p.id = ppt.partner_id
    WHERE ppt.reason IN ('PURCHASE', 'purchase', 'POINTS_PURCHASED')
      AND ppt.change > 0
      AND (p_start_date IS NULL OR ppt.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ppt.created_at <= p_end_date)
  ),
  all_purchases AS (
    SELECT * FROM customer_purchases
    UNION ALL
    SELECT * FROM partner_purchases
  )
  SELECT
    ap.user_id,
    ap.user_name,
    ap.user_email,
    ap.user_type,
    SUM(ap.change)::INTEGER as total_points_purchased,
    (SUM(ap.change) / 100.0)::DECIMAL as total_spent_gel,
    COUNT(*)::INTEGER as purchase_count,
    MIN(ap.created_at) as first_purchase,
    MAX(ap.created_at) as last_purchase
  FROM all_purchases ap
  GROUP BY ap.user_id, ap.user_name, ap.user_email, ap.user_type
  ORDER BY total_points_purchased DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_point_buyers IS 
'Returns top buyers by total points purchased (customers + partners)';

GRANT EXECUTE ON FUNCTION get_top_point_buyers TO authenticated;

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Fixed buyer purchase functions';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated functions:';
  RAISE NOTICE '  ✅ get_buyer_purchase_details() - includes customers + partners';
  RAISE NOTICE '  ✅ get_top_point_buyers() - includes customers + partners';
  RAISE NOTICE '';
  RAISE NOTICE 'Refresh the Finance tab to see all purchases!';
  RAISE NOTICE '============================================================';
END $$;
