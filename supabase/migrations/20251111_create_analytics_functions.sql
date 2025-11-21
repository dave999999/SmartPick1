-- =====================================================
-- ANALYTICS SQL FUNCTIONS FOR ADMIN DASHBOARD
-- =====================================================
-- Creates missing analytics functions referenced by AdminAnalyticsPanel
-- Date: 2025-11-11

-- =====================================================
-- DROP EXISTING FUNCTIONS (if they exist with different signatures)
-- =====================================================
DROP FUNCTION IF EXISTS get_user_growth_stats() CASCADE;
DROP FUNCTION IF EXISTS get_top_partners(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_category_stats() CASCADE;
DROP FUNCTION IF EXISTS get_user_retention_stats(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_peak_usage_times() CASCADE;

-- =====================================================
-- 1. USER GROWTH STATS (Last 30 days)
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_growth_stats()
RETURNS TABLE (
  date TEXT,
  new_users INTEGER,
  cumulative_users INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dates AS (
    -- Generate last 30 days
    SELECT CURRENT_DATE - INTERVAL '29 days' AS day_date
    UNION ALL
    SELECT day_date + INTERVAL '1 day'
    FROM dates
    WHERE day_date < CURRENT_DATE
  ),
  daily_signups AS (
    SELECT 
      DATE(created_at) as signup_date,
      COUNT(*)::INTEGER as new_users
    FROM public.users
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND role != 'ADMIN' -- Exclude admins from analytics
    GROUP BY DATE(created_at)
  ),
  cumulative AS (
    SELECT
      d.day_date,
      COALESCE(ds.new_users, 0) as new_users,
      (
        SELECT COUNT(*)::INTEGER
        FROM public.users u
        WHERE DATE(u.created_at) <= d.day_date
          AND u.role != 'ADMIN'
      ) as cumulative_users
    FROM dates d
    LEFT JOIN daily_signups ds ON DATE(d.day_date) = ds.signup_date
  )
  SELECT 
    TO_CHAR(cumulative.day_date, 'Mon DD') as date,
    cumulative.new_users,
    cumulative.cumulative_users
  FROM cumulative
  ORDER BY cumulative.day_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. TOP PARTNERS (By pickups and revenue)
-- =====================================================
CREATE OR REPLACE FUNCTION get_top_partners(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  partner_id UUID,
  business_name TEXT,
  total_pickups BIGINT,
  total_revenue NUMERIC,
  avg_rating NUMERIC,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as partner_id,
    p.business_name::TEXT,
    COUNT(DISTINCT r.id) as total_pickups,
    -- Revenue: Sum of total_price from PICKED_UP reservations
    COALESCE(SUM(CASE WHEN r.status = 'PICKED_UP' THEN r.total_price ELSE 0 END), 0)::NUMERIC as total_revenue,
    -- Average rating (if rating system exists)
    0::NUMERIC as avg_rating, -- Placeholder
    -- Completion rate
    ROUND(
      (COUNT(DISTINCT CASE WHEN r.status = 'PICKED_UP' THEN r.id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT r.id), 0)) * 100, 
      2
    ) as completion_rate
  FROM public.partners p
  LEFT JOIN public.offers o ON o.partner_id = p.id
  LEFT JOIN public.reservations r ON r.offer_id = o.id
  WHERE p.status = 'APPROVED'
    AND r.created_at >= CURRENT_DATE - INTERVAL '90 days' -- Last 90 days
  GROUP BY p.id, p.business_name
  ORDER BY total_pickups DESC, total_revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. CATEGORY PERFORMANCE STATS
-- =====================================================
CREATE OR REPLACE FUNCTION get_category_stats()
RETURNS TABLE (
  category TEXT,
  total_pickups BIGINT,
  total_revenue NUMERIC,
  avg_price NUMERIC,
  offer_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.category::TEXT,
    COUNT(DISTINCT CASE WHEN r.status = 'PICKED_UP' THEN r.id END) as total_pickups,
    COALESCE(SUM(CASE WHEN r.status = 'PICKED_UP' THEN r.total_price ELSE 0 END), 0)::NUMERIC as total_revenue,
    ROUND(AVG(o.smart_price), 2)::NUMERIC as avg_price,
    COUNT(DISTINCT o.id) as offer_count
  FROM public.offers o
  LEFT JOIN public.reservations r ON r.offer_id = o.id
  WHERE o.status = 'ACTIVE'
    AND o.category IS NOT NULL
  GROUP BY o.category
  ORDER BY total_pickups DESC, total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. ADVANCED ANALYTICS: RETENTION METRICS
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_retention_stats(days INTEGER DEFAULT 30)
RETURNS TABLE (
  cohort_month TEXT,
  total_users INTEGER,
  returned_users INTEGER,
  retention_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH cohorts AS (
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as cohort_month,
      id as user_id,
      created_at
    FROM public.users
    WHERE role != 'ADMIN'
      AND created_at >= CURRENT_DATE - INTERVAL '6 months'
  ),
  returns AS (
    SELECT DISTINCT
      c.cohort_month,
      c.user_id,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.audit_logs al
          WHERE al.admin_id = c.user_id
            AND al.created_at > c.created_at + INTERVAL '7 days'
            AND al.created_at <= c.created_at + INTERVAL '30 days'
        ) THEN 1
        ELSE 0
      END as returned
    FROM cohorts c
  )
  SELECT
    cohort_month,
    COUNT(DISTINCT user_id)::INTEGER as total_users,
    SUM(returned)::INTEGER as returned_users,
    ROUND((SUM(returned)::NUMERIC / NULLIF(COUNT(DISTINCT user_id), 0)) * 100, 2) as retention_rate
  FROM returns
  GROUP BY cohort_month
  ORDER BY cohort_month DESC
  LIMIT 6;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. PEAK USAGE TIMES (Hourly distribution)
-- =====================================================
CREATE OR REPLACE FUNCTION get_peak_usage_times()
RETURNS TABLE (
  hour_of_day INTEGER,
  total_reservations BIGINT,
  total_offers_created BIGINT,
  activity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH hourly_reservations AS (
    SELECT
      EXTRACT(HOUR FROM created_at)::INTEGER as hour,
      COUNT(*) as res_count
    FROM public.reservations
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY EXTRACT(HOUR FROM created_at)
  ),
  hourly_offers AS (
    SELECT
      EXTRACT(HOUR FROM created_at)::INTEGER as hour,
      COUNT(*) as offer_count
    FROM public.offers
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY EXTRACT(HOUR FROM created_at)
  )
  SELECT
    COALESCE(hr.hour, ho.hour)::INTEGER as hour_of_day,
    COALESCE(hr.res_count, 0) as total_reservations,
    COALESCE(ho.offer_count, 0) as total_offers_created,
    (COALESCE(hr.res_count, 0) + COALESCE(ho.offer_count, 0) * 0.5)::NUMERIC as activity_score
  FROM hourly_reservations hr
  FULL OUTER JOIN hourly_offers ho ON hr.hour = ho.hour
  ORDER BY hour_of_day ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_user_growth_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_partners TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_retention_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_peak_usage_times TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION get_user_growth_stats IS 'Returns daily user growth for last 30 days';
COMMENT ON FUNCTION get_top_partners IS 'Returns top performing partners by pickups and revenue';
COMMENT ON FUNCTION get_category_stats IS 'Returns performance metrics by offer category';
COMMENT ON FUNCTION get_user_retention_stats IS 'Returns user retention rates by cohort month';
COMMENT ON FUNCTION get_peak_usage_times IS 'Returns hourly activity distribution';
