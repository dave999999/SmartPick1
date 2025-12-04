-- =====================================================
-- CONNECTION POOL MONITORING
-- =====================================================
-- Purpose: Monitor connection pool usage for capacity planning
-- Created: 2024-12-04
-- =====================================================

CREATE OR REPLACE FUNCTION get_connection_pool_stats()
RETURNS TABLE (
  active_connections bigint,
  max_connections integer,
  usage_percent numeric,
  idle_connections bigint,
  active_queries bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE state = 'active') as active_connections,
    current_setting('max_connections')::integer as max_connections,
    ROUND((COUNT(*) FILTER (WHERE state = 'active')::numeric / current_setting('max_connections')::numeric) * 100, 2) as usage_percent,
    COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
    COUNT(*) FILTER (WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%') as active_queries
  FROM pg_stat_activity
  WHERE datname = current_database();
END;
$$;

COMMENT ON FUNCTION get_connection_pool_stats IS 'Get current connection pool statistics for monitoring';

-- Test query
-- SELECT * FROM get_connection_pool_stats();
