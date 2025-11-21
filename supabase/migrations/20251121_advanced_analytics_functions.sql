-- Advanced Analytics Functions for Comprehensive Business Intelligence

-- 1. Peak Hours Analysis: Hourly reservation patterns
CREATE OR REPLACE FUNCTION get_peak_hours()
RETURNS TABLE(
  hour INTEGER,
  reservation_count BIGINT,
  revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM r.created_at)::INTEGER AS hour,
    COUNT(r.id) AS reservation_count,
    ROUND(COALESCE(SUM(r.total_price), 0), 2) AS revenue
  FROM reservations r
  WHERE r.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY EXTRACT(HOUR FROM r.created_at)
  ORDER BY hour;
END;
$$;

-- 2. Day of Week Performance
CREATE OR REPLACE FUNCTION get_day_of_week_stats()
RETURNS TABLE(
  day_of_week INTEGER,
  day_name TEXT,
  reservation_count BIGINT,
  revenue NUMERIC,
  avg_order_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM r.created_at)::INTEGER AS day_of_week,
    TO_CHAR(r.created_at, 'Day') AS day_name,
    COUNT(r.id) AS reservation_count,
    ROUND(COALESCE(SUM(r.total_price), 0), 2) AS revenue,
    ROUND(COALESCE(AVG(r.total_price), 0), 2) AS avg_order_value
  FROM reservations r
  WHERE r.created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND r.status = 'PICKED_UP'
  GROUP BY EXTRACT(DOW FROM r.created_at), TO_CHAR(r.created_at, 'Day')
  ORDER BY day_of_week;
END;
$$;

-- 3. Month-over-Month Growth Comparison
CREATE OR REPLACE FUNCTION get_month_over_month_growth()
RETURNS TABLE(
  metric_name TEXT,
  current_month NUMERIC,
  previous_month NUMERIC,
  growth_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH current_month_data AS (
    SELECT
      COUNT(DISTINCT user_id) AS users,
      COUNT(*) FILTER (WHERE status = 'PICKED_UP') AS pickups,
      COALESCE(SUM(total_price) FILTER (WHERE status = 'PICKED_UP'), 0) AS revenue
    FROM reservations
    WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
  ),
  previous_month_data AS (
    SELECT
      COUNT(DISTINCT user_id) AS users,
      COUNT(*) FILTER (WHERE status = 'PICKED_UP') AS pickups,
      COALESCE(SUM(total_price) FILTER (WHERE status = 'PICKED_UP'), 0) AS revenue
    FROM reservations
    WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
      AND created_at < DATE_TRUNC('month', CURRENT_DATE)
  )
  SELECT 'Active Users'::TEXT AS metric_name,
         ROUND(cm.users::NUMERIC, 2) AS current_month,
         ROUND(pm.users::NUMERIC, 2) AS previous_month,
         ROUND(((cm.users - pm.users)::NUMERIC / NULLIF(pm.users, 0) * 100), 2) AS growth_rate
  FROM current_month_data cm, previous_month_data pm
  UNION ALL
  SELECT 'Pickups'::TEXT,
         ROUND(cm.pickups::NUMERIC, 2),
         ROUND(pm.pickups::NUMERIC, 2),
         ROUND(((cm.pickups - pm.pickups)::NUMERIC / NULLIF(pm.pickups, 0) * 100), 2)
  FROM current_month_data cm, previous_month_data pm
  UNION ALL
  SELECT 'Revenue'::TEXT,
         ROUND(cm.revenue, 2),
         ROUND(pm.revenue, 2),
         ROUND(((cm.revenue - pm.revenue) / NULLIF(pm.revenue, 0) * 100), 2)
  FROM current_month_data cm, previous_month_data pm;
END;
$$;

-- 4. Partner Health Score & Performance
CREATE OR REPLACE FUNCTION get_partner_health_scores()
RETURNS TABLE(
  partner_id UUID,
  business_name TEXT,
  health_score NUMERIC,
  completion_rate NUMERIC,
  total_offers INTEGER,
  total_pickups BIGINT,
  revenue_30d NUMERIC,
  avg_rating NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS partner_id,
    p.business_name::TEXT,
    ROUND(
      (COALESCE(
        (COUNT(r.id) FILTER (WHERE r.status = 'PICKED_UP')::NUMERIC / NULLIF(COUNT(r.id), 0) * 100),
        0
      ) * 0.6 +
      COALESCE(COUNT(DISTINCT o.id) * 5, 0) * 0.2 +
      COALESCE(AVG(r.rating), 3) * 20 * 0.2),
      2
    ) AS health_score,
    ROUND(
      COALESCE(
        (COUNT(r.id) FILTER (WHERE r.status = 'PICKED_UP')::NUMERIC / NULLIF(COUNT(r.id), 0) * 100),
        0
      ), 2
    ) AS completion_rate,
    COUNT(DISTINCT o.id)::INTEGER AS total_offers,
    COUNT(r.id) FILTER (WHERE r.status = 'PICKED_UP') AS total_pickups,
    ROUND(COALESCE(SUM(r.total_price) FILTER (WHERE r.status = 'PICKED_UP'), 0), 2) AS revenue_30d,
    ROUND(COALESCE(AVG(r.rating), 0), 2) AS avg_rating,
    CASE
      WHEN COUNT(r.id) FILTER (WHERE r.status = 'PICKED_UP' AND r.created_at >= CURRENT_DATE - INTERVAL '7 days') = 0 THEN 'At Risk'
      WHEN COUNT(r.id) FILTER (WHERE r.status = 'PICKED_UP')::NUMERIC / NULLIF(COUNT(r.id), 0) < 0.5 THEN 'Needs Attention'
      WHEN COUNT(r.id) FILTER (WHERE r.status = 'PICKED_UP')::NUMERIC / NULLIF(COUNT(r.id), 0) >= 0.8 THEN 'Excellent'
      ELSE 'Good'
    END::TEXT AS status
  FROM partners p
  LEFT JOIN offers o ON o.partner_id = p.id
  LEFT JOIN reservations r ON r.offer_id = o.id
    AND r.created_at >= CURRENT_DATE - INTERVAL '30 days'
  WHERE p.status = 'approved'
  GROUP BY p.id, p.business_name
  ORDER BY health_score DESC;
END;
$$;

-- 5. User Behavior: Repeat Customer Analysis
CREATE OR REPLACE FUNCTION get_user_behavior_stats()
RETURNS TABLE(
  metric_name TEXT,
  value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT
      user_id,
      COUNT(*) AS reservation_count,
      COUNT(*) FILTER (WHERE status = 'PICKED_UP') AS pickup_count,
      MIN(created_at) AS first_reservation,
      MAX(created_at) AS last_reservation
    FROM reservations
    WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY user_id
  )
  SELECT 'Repeat Customer Rate (%)'::TEXT AS metric_name,
         ROUND((COUNT(*) FILTER (WHERE reservation_count > 1)::NUMERIC / NULLIF(COUNT(*), 0) * 100), 2) AS value
  FROM user_stats
  UNION ALL
  SELECT 'Avg Reservations per User'::TEXT,
         ROUND(AVG(reservation_count), 2)
  FROM user_stats
  UNION ALL
  SELECT 'Avg Days Between Reservations'::TEXT,
         ROUND(AVG(EXTRACT(EPOCH FROM (last_reservation - first_reservation)) / 86400 / NULLIF(reservation_count - 1, 0)), 2)
  FROM user_stats
  WHERE reservation_count > 1
  UNION ALL
  SELECT 'Users with 2+ Pickups'::TEXT,
         COUNT(*) FILTER (WHERE pickup_count >= 2)
  FROM user_stats
  UNION ALL
  SELECT 'Avg Time to First Pickup (days)'::TEXT,
         ROUND(AVG(EXTRACT(EPOCH FROM (last_reservation - first_reservation)) / 86400), 2)
  FROM user_stats
  WHERE pickup_count > 0;
END;
$$;

-- 6. Revenue by Category Over Time
CREATE OR REPLACE FUNCTION get_revenue_by_category_trends()
RETURNS TABLE(
  date DATE,
  category TEXT,
  revenue NUMERIC,
  pickup_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(r.created_at) AS date,
    o.category::TEXT,
    ROUND(COALESCE(SUM(r.total_price), 0), 2) AS revenue,
    COUNT(r.id) AS pickup_count
  FROM reservations r
  JOIN offers o ON r.offer_id = o.id
  WHERE r.status = 'PICKED_UP'
    AND r.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(r.created_at), o.category
  ORDER BY date DESC, revenue DESC;
END;
$$;

-- 7. Average Time to Pickup Analysis
CREATE OR REPLACE FUNCTION get_time_to_pickup_stats()
RETURNS TABLE(
  avg_hours_to_pickup NUMERIC,
  median_hours_to_pickup NUMERIC,
  fastest_pickup_hours NUMERIC,
  slowest_pickup_hours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH pickup_times AS (
    SELECT
      EXTRACT(EPOCH FROM (pickup_time - created_at)) / 3600 AS hours_to_pickup
    FROM reservations
    WHERE status = 'PICKED_UP'
      AND pickup_time IS NOT NULL
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT
    ROUND(AVG(hours_to_pickup), 2) AS avg_hours_to_pickup,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY hours_to_pickup), 2) AS median_hours_to_pickup,
    ROUND(MIN(hours_to_pickup), 2) AS fastest_pickup_hours,
    ROUND(MAX(hours_to_pickup), 2) AS slowest_pickup_hours
  FROM pickup_times;
END;
$$;

-- 8. Cancellation Analysis
CREATE OR REPLACE FUNCTION get_cancellation_stats()
RETURNS TABLE(
  total_cancelled BIGINT,
  cancellation_rate NUMERIC,
  cancelled_revenue_loss NUMERIC,
  avg_time_before_cancellation_hours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH cancellation_data AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
      COUNT(*) AS total,
      SUM(total_price) FILTER (WHERE status = 'CANCELLED') AS lost_revenue,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) FILTER (WHERE status = 'CANCELLED') AS avg_cancel_time
    FROM reservations
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  )
  SELECT
    cancelled AS total_cancelled,
    ROUND((cancelled::NUMERIC / NULLIF(total, 0) * 100), 2) AS cancellation_rate,
    ROUND(COALESCE(lost_revenue, 0), 2) AS cancelled_revenue_loss,
    ROUND(COALESCE(avg_cancel_time, 0), 2) AS avg_time_before_cancellation_hours
  FROM cancellation_data;
END;
$$;

-- 9. Top Growing Partners (MoM)
CREATE OR REPLACE FUNCTION get_top_growing_partners()
RETURNS TABLE(
  partner_id UUID,
  business_name TEXT,
  current_month_revenue NUMERIC,
  previous_month_revenue NUMERIC,
  growth_rate NUMERIC,
  current_month_pickups BIGINT,
  previous_month_pickups BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH current_month AS (
    SELECT
      p.id,
      p.business_name,
      SUM(r.total_price) FILTER (WHERE r.status = 'PICKED_UP') AS revenue,
      COUNT(r.id) FILTER (WHERE r.status = 'PICKED_UP') AS pickups
    FROM partners p
    JOIN offers o ON o.partner_id = p.id
    JOIN reservations r ON r.offer_id = o.id
    WHERE r.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY p.id, p.business_name
  ),
  previous_month AS (
    SELECT
      p.id,
      SUM(r.total_price) FILTER (WHERE r.status = 'PICKED_UP') AS revenue,
      COUNT(r.id) FILTER (WHERE r.status = 'PICKED_UP') AS pickups
    FROM partners p
    JOIN offers o ON o.partner_id = p.id
    JOIN reservations r ON r.offer_id = o.id
    WHERE r.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
      AND r.created_at < DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY p.id
  )
  SELECT
    cm.id AS partner_id,
    cm.business_name::TEXT,
    ROUND(COALESCE(cm.revenue, 0), 2) AS current_month_revenue,
    ROUND(COALESCE(pm.revenue, 0), 2) AS previous_month_revenue,
    ROUND(((COALESCE(cm.revenue, 0) - COALESCE(pm.revenue, 0)) / NULLIF(pm.revenue, 0) * 100), 2) AS growth_rate,
    COALESCE(cm.pickups, 0) AS current_month_pickups,
    COALESCE(pm.pickups, 0) AS previous_month_pickups
  FROM current_month cm
  LEFT JOIN previous_month pm ON cm.id = pm.id
  WHERE COALESCE(cm.revenue, 0) > 0
  ORDER BY growth_rate DESC NULLS LAST
  LIMIT 10;
END;
$$;

-- 10. Geographic Revenue Distribution (if location data exists)
CREATE OR REPLACE FUNCTION get_revenue_by_location()
RETURNS TABLE(
  location TEXT,
  partner_count BIGINT,
  total_revenue NUMERIC,
  total_pickups BIGINT,
  avg_revenue_per_partner NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.city, 'Unknown')::TEXT AS location,
    COUNT(DISTINCT p.id) AS partner_count,
    ROUND(COALESCE(SUM(r.total_price) FILTER (WHERE r.status = 'PICKED_UP'), 0), 2) AS total_revenue,
    COUNT(r.id) FILTER (WHERE r.status = 'PICKED_UP') AS total_pickups,
    ROUND(COALESCE(SUM(r.total_price) FILTER (WHERE r.status = 'PICKED_UP'), 0) / NULLIF(COUNT(DISTINCT p.id), 0), 2) AS avg_revenue_per_partner
  FROM partners p
  LEFT JOIN offers o ON o.partner_id = p.id
  LEFT JOIN reservations r ON r.offer_id = o.id
    AND r.created_at >= CURRENT_DATE - INTERVAL '30 days'
  WHERE p.status = 'approved'
  GROUP BY p.city
  ORDER BY total_revenue DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_peak_hours() TO authenticated;
GRANT EXECUTE ON FUNCTION get_day_of_week_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_month_over_month_growth() TO authenticated;
GRANT EXECUTE ON FUNCTION get_partner_health_scores() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_behavior_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_by_category_trends() TO authenticated;
GRANT EXECUTE ON FUNCTION get_time_to_pickup_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cancellation_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_growing_partners() TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_by_location() TO authenticated;
