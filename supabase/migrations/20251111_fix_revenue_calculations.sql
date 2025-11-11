-- =====================================================
-- FIX REVENUE CALCULATIONS FOR SMARTPICK.GE
-- =====================================================
-- BUSINESS MODEL: Platform revenue = Point purchases ONLY
-- Users pay partners directly via reservations (platform doesn't touch partner money)
-- =====================================================

-- 1. DROP INCORRECT FUNCTIONS (that calculate revenue from reservation.total_price)
DROP FUNCTION IF EXISTS get_platform_revenue_stats(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS get_admin_dashboard_stats();

-- 2. DROP PARTNER PAYOUT TABLE (Not applicable - platform doesn't handle partner payouts)
DROP TABLE IF EXISTS public.partner_payouts CASCADE;

-- =====================================================
-- CORRECT REVENUE FUNCTIONS (Based on Point Purchases)
-- =====================================================

-- Get platform revenue stats (from point purchases)
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
  SELECT
    -- Total revenue from point purchases (assuming 1 point = 1 GEL or your pricing)
    -- You may need to add a 'amount_paid' column to point_transactions if points ≠ money
    COALESCE(SUM(pt.change), 0)::DECIMAL AS total_revenue,
    COUNT(*) AS total_point_purchases,
    COALESCE(SUM(pt.change), 0) AS total_points_sold,
    COALESCE(AVG(pt.change), 0)::DECIMAL AS average_purchase_value,
    COUNT(DISTINCT pt.user_id) AS unique_buyers
  FROM public.point_transactions pt
  WHERE pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
    AND pt.change > 0  -- Only count positive transactions (purchases)
    AND pt.created_at >= p_start_date
    AND pt.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_platform_revenue_stats IS 'Returns platform revenue from point purchases (NOT reservation prices)';

-- Get admin dashboard stats (corrected revenue calculation)
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS TABLE (
  total_users integer,
  total_partners integer,
  active_offers integer,
  reservations_today integer,
  revenue_today numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (select count(*) from public.users where role = 'CUSTOMER')::integer as total_users,
    (select count(*) from public.partners where status = 'APPROVED')::integer as total_partners,
    (select count(*) from public.offers where status = 'ACTIVE')::integer as active_offers,
    (select count(*) from public.reservations where status IN ('RESERVED', 'CONFIRMED', 'PICKED_UP') and created_at::date = now()::date)::integer as reservations_today,
    -- CORRECTED: Revenue from point purchases today, not reservation prices
    coalesce(
      (select sum(change) from public.point_transactions 
       where reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE') 
         and change > 0 
         and created_at::date = now()::date), 
      0
    )::numeric as revenue_today;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_admin_dashboard_stats IS 'Returns admin dashboard stats with CORRECT revenue (point purchases only)';

-- =====================================================
-- ANALYTICS: Point Purchase Trends
-- =====================================================

-- Get point purchase trends over time
CREATE OR REPLACE FUNCTION get_point_purchase_trends(
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  purchase_date DATE,
  total_purchases BIGINT,
  total_points_sold BIGINT,
  total_revenue DECIMAL,
  unique_buyers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(pt.created_at) AS purchase_date,
    COUNT(*) AS total_purchases,
    COALESCE(SUM(pt.change), 0) AS total_points_sold,
    COALESCE(SUM(pt.change), 0)::DECIMAL AS total_revenue,
    COUNT(DISTINCT pt.user_id) AS unique_buyers
  FROM public.point_transactions pt
  WHERE pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
    AND pt.change > 0
    AND pt.created_at >= NOW() - INTERVAL '1 day' * p_days_back
  GROUP BY DATE(pt.created_at)
  ORDER BY purchase_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_point_purchase_trends IS 'Returns daily point purchase trends for revenue tracking';

-- =====================================================
-- TOP POINT BUYERS
-- =====================================================

CREATE OR REPLACE FUNCTION get_top_point_buyers(
  p_limit INTEGER DEFAULT 10,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  total_points_purchased BIGINT,
  total_purchases BIGINT,
  average_purchase_size DECIMAL,
  last_purchase_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    COALESCE(SUM(pt.change), 0) AS total_points_purchased,
    COUNT(*) AS total_purchases,
    COALESCE(AVG(pt.change), 0)::DECIMAL AS average_purchase_size,
    MAX(pt.created_at) AS last_purchase_date
  FROM public.users u
  INNER JOIN public.point_transactions pt ON pt.user_id = u.id
  WHERE pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
    AND pt.change > 0
    AND pt.created_at >= p_start_date
    AND pt.created_at <= p_end_date
  GROUP BY u.id, u.name, u.email
  ORDER BY total_points_purchased DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_point_buyers IS 'Returns top users by point purchases (platform revenue contributors)';

-- =====================================================
-- POINT PURCHASE STATISTICS
-- =====================================================

CREATE OR REPLACE FUNCTION get_point_purchase_stats()
RETURNS TABLE (
  total_revenue_alltime DECIMAL,
  total_purchases_alltime BIGINT,
  revenue_this_month DECIMAL,
  purchases_this_month BIGINT,
  revenue_last_month DECIMAL,
  purchases_last_month BIGINT,
  average_purchase_size DECIMAL,
  unique_buyers_alltime BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- All-time stats
    COALESCE((SELECT SUM(change) FROM point_transactions WHERE reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE') AND change > 0), 0)::DECIMAL AS total_revenue_alltime,
    COALESCE((SELECT COUNT(*) FROM point_transactions WHERE reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE') AND change > 0), 0) AS total_purchases_alltime,
    
    -- This month
    COALESCE((SELECT SUM(change) FROM point_transactions WHERE reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE') AND change > 0 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())), 0)::DECIMAL AS revenue_this_month,
    COALESCE((SELECT COUNT(*) FROM point_transactions WHERE reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE') AND change > 0 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())), 0) AS purchases_this_month,
    
    -- Last month
    COALESCE((SELECT SUM(change) FROM point_transactions WHERE reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE') AND change > 0 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')), 0)::DECIMAL AS revenue_last_month,
    COALESCE((SELECT COUNT(*) FROM point_transactions WHERE reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE') AND change > 0 AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')), 0) AS purchases_last_month,
    
    -- Average purchase size
    COALESCE((SELECT AVG(change) FROM point_transactions WHERE reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE') AND change > 0), 0)::DECIMAL AS average_purchase_size,
    
    -- Unique buyers
    (SELECT COUNT(DISTINCT user_id) FROM point_transactions WHERE reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE') AND change > 0) AS unique_buyers_alltime;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_point_purchase_stats IS 'Returns comprehensive point purchase statistics (platform revenue)';

-- =====================================================
-- UPDATE EXISTING FUNCTIONS (Remove revenue calculations from reservation-based functions)
-- =====================================================

-- Top partners function should NOT include "revenue" (that's partner money, not platform revenue)
DROP FUNCTION IF EXISTS get_top_partners(INTEGER);

CREATE OR REPLACE FUNCTION get_top_partners(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  partner_id UUID,
  business_name TEXT,
  business_type TEXT,
  total_reservations BIGINT,
  completed_reservations BIGINT,
  completion_rate DECIMAL,
  total_offers INTEGER,
  average_rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS partner_id,
    p.business_name,
    p.business_type,
    COUNT(DISTINCT r.id) AS total_reservations,
    COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'PICKED_UP') AS completed_reservations,
    CASE
      WHEN COUNT(DISTINCT r.id) > 0
      THEN (COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'PICKED_UP')::DECIMAL / COUNT(DISTINCT r.id)::DECIMAL * 100)
      ELSE 0
    END AS completion_rate,
    COUNT(DISTINCT o.id)::INTEGER AS total_offers,
    COALESCE(AVG(o.rating), 0)::DECIMAL AS average_rating
  FROM public.partners p
  LEFT JOIN public.offers o ON o.partner_id = p.id
  LEFT JOIN public.reservations r ON r.offer_id = o.id
  WHERE p.status = 'APPROVED'
  GROUP BY p.id, p.business_name, p.business_type
  ORDER BY total_reservations DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_top_partners IS 'Returns top partners by reservation count (NOT revenue - users pay partners directly)';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_platform_revenue_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_point_purchase_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_point_buyers TO authenticated;
GRANT EXECUTE ON FUNCTION get_point_purchase_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_partners TO authenticated;

-- =====================================================
-- NOTES FOR FUTURE
-- =====================================================
-- If you want to track actual GEL amounts (not just point counts):
-- 1. Add 'amount_paid_gel' column to point_transactions
-- 2. Update purchase flow to record: change=points, amount_paid_gel=actual_money
-- 3. Modify revenue functions to SUM(amount_paid_gel) instead of SUM(change)
