-- Revenue Trends: Daily revenue for the last 30 days
CREATE OR REPLACE FUNCTION get_revenue_trends()
RETURNS TABLE(
  date DATE,
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
    ROUND(COALESCE(SUM(r.total_price), 0), 2) AS revenue,
    COUNT(r.id) AS pickup_count
  FROM reservations r
  WHERE r.status = 'PICKED_UP'
    AND r.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(r.created_at)
  ORDER BY date DESC;
END;
$$;

-- Reservation Funnel: Count reservations by status
CREATE OR REPLACE FUNCTION get_reservation_funnel()
RETURNS TABLE(
  status VARCHAR,
  count BIGINT,
  revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.status::VARCHAR,
    COUNT(r.id) AS count,
    ROUND(COALESCE(SUM(r.total_price), 0), 2) AS revenue
  FROM reservations r
  WHERE r.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY r.status
  ORDER BY 
    CASE r.status
      WHEN 'ACTIVE' THEN 1
      WHEN 'PICKED_UP' THEN 2
      WHEN 'CANCELLED' THEN 3
      ELSE 4
    END;
END;
$$;

-- Business Metrics: KPIs for overview
CREATE OR REPLACE FUNCTION get_business_metrics()
RETURNS TABLE(
  avg_order_value NUMERIC,
  conversion_rate NUMERIC,
  revenue_per_pickup NUMERIC,
  active_reservations BIGINT,
  total_revenue_30d NUMERIC,
  total_pickups_30d BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Average Order Value (all reservations last 30 days)
    ROUND(COALESCE(AVG(r.total_price), 0), 2) AS avg_order_value,
    
    -- Conversion Rate: Picked up / Total * 100
    ROUND(
      COALESCE(
        (COUNT(*) FILTER (WHERE r.status = 'PICKED_UP')::NUMERIC / NULLIF(COUNT(*), 0) * 100),
        0
      ), 2
    ) AS conversion_rate,
    
    -- Revenue per Pickup
    ROUND(
      COALESCE(
        SUM(r.total_price) FILTER (WHERE r.status = 'PICKED_UP') / NULLIF(COUNT(*) FILTER (WHERE r.status = 'PICKED_UP'), 0),
        0
      ), 2
    ) AS revenue_per_pickup,
    
    -- Active Reservations (current)
    COUNT(*) FILTER (WHERE r.status = 'ACTIVE') AS active_reservations,
    
    -- Total Revenue Last 30 Days
    ROUND(COALESCE(SUM(r.total_price) FILTER (WHERE r.status = 'PICKED_UP'), 0), 2) AS total_revenue_30d,
    
    -- Total Pickups Last 30 Days
    COUNT(*) FILTER (WHERE r.status = 'PICKED_UP') AS total_pickups_30d
    
  FROM reservations r
  WHERE r.created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_revenue_trends() TO authenticated;
GRANT EXECUTE ON FUNCTION get_reservation_funnel() TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_metrics() TO authenticated;
