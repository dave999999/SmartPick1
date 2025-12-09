-- =====================================================
-- AUTOMATED MAINTENANCE SCHEDULE - December 9, 2025
-- =====================================================
-- Purpose: Set up automatic VACUUM and maintenance
-- Why: Prevent dead row accumulation without manual intervention
-- When: Uses pg_cron extension (if available on Supabase)
-- =====================================================

-- Note: Supabase handles autovacuum automatically, but you can
-- adjust settings per table if needed

-- =====================================================
-- AUTOVACUUM TUNING (Optional - for high-churn tables)
-- =====================================================

-- users table: High auth churn, vacuum more frequently
ALTER TABLE public.users SET (
  autovacuum_vacuum_scale_factor = 0.05,  -- Vacuum when 5% rows are dead (vs default 20%)
  autovacuum_analyze_scale_factor = 0.05  -- Analyze when 5% rows change
);

-- api_rate_limits: Very high churn, vacuum aggressively
ALTER TABLE public.api_rate_limits SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_vacuum_cost_delay = 10       -- Faster vacuum (lower delay)
);

-- system_settings: Low activity but critical
ALTER TABLE public.system_settings SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.1
);

-- points_history: Medium churn
ALTER TABLE public.points_history SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.1
);

-- user_stats: Medium churn
ALTER TABLE public.user_stats SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.1
);

-- partners: Low churn
ALTER TABLE public.partners SET (
  autovacuum_vacuum_scale_factor = 0.15,
  autovacuum_analyze_scale_factor = 0.15
);

-- =====================================================
-- MONITORING FUNCTION
-- Create a function to check table health
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_table_health()
RETURNS TABLE (
  table_name text,
  live_rows bigint,
  dead_rows bigint,
  dead_percentage numeric,
  last_vacuum timestamp with time zone,
  needs_vacuum boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    relname::text,
    n_live_tup,
    n_dead_tup,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1),
    pg_stat_user_tables.last_vacuum,
    (n_dead_tup > 100 AND 
     100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0) > 30) as needs_vacuum
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND (n_live_tup + n_dead_tup) > 0
  ORDER BY 
    (100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0)) DESC;
END;
$$;

-- Grant access to authenticated users (for admin dashboard)
GRANT EXECUTE ON FUNCTION public.check_table_health() TO authenticated;

-- =====================================================
-- USAGE:
-- =====================================================
-- Run this query in your admin dashboard to check health:
-- SELECT * FROM check_table_health() WHERE needs_vacuum = true;
-- =====================================================

COMMENT ON FUNCTION public.check_table_health() IS 
'Monitoring function to check which tables need VACUUM. Returns tables with >30% dead rows and >100 dead tuples.';
