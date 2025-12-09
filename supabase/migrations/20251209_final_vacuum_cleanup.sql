-- =====================================================
-- FINAL VACUUM CLEANUP - December 9, 2025
-- =====================================================
-- Purpose: Clean up remaining dead rows from tables
-- Issue: Several tables accumulated dead rows after initial VACUUM
-- Impact: Improves query performance and reduces bloat
-- =====================================================

-- ⚠️ IMPORTANT: VACUUM cannot run in a transaction block
-- In Supabase SQL Editor, you must run each command SEPARATELY
-- Copy and paste ONE LINE AT A TIME and execute individually
-- =====================================================

-- ❌ DO NOT run this entire file at once
-- ✅ DO copy/paste each line below ONE BY ONE:

-- Priority 1: users table (71.9% dead rows - auth session churn)
-- VACUUM ANALYZE public.users;

-- Priority 1: system_settings (95.0% dead rows)
-- VACUUM ANALYZE public.system_settings;

-- Priority 2: user_stats (52.9% dead rows)
-- VACUUM ANALYZE public.user_stats;

-- Priority 2: points_history (50.9% dead rows - 31 days since last vacuum)
-- VACUUM ANALYZE public.points_history;

-- Priority 2: partners (53.3% dead rows)
-- VACUUM ANALYZE public.partners;

-- Priority 3: api_rate_limits (64.9% dead rows - active churn is expected)
-- VACUUM ANALYZE public.api_rate_limits;

-- =====================================================
-- ALTERNATIVE: Use a function to schedule vacuums
-- =====================================================

CREATE OR REPLACE FUNCTION public.manual_vacuum_tables()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Note: This function just returns the commands to run
  -- VACUUM must be run outside transactions
  RETURN 'Run these commands individually in SQL Editor:
  
VACUUM ANALYZE public.users;
VACUUM ANALYZE public.system_settings;
VACUUM ANALYZE public.user_stats;
VACUUM ANALYZE public.points_history;
VACUUM ANALYZE public.partners;
VACUUM ANALYZE public.api_rate_limits;';
END;
$$;

-- =====================================================
-- VERIFICATION QUERY
-- Run this after to verify dead rows are cleared:
-- =====================================================
-- SELECT 
--   schemaname,
--   relname,
--   n_live_tup as live_rows,
--   n_dead_tup as dead_rows,
--   ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) as dead_percentage,
--   last_vacuum,
--   last_autovacuum
-- FROM pg_stat_user_tables
-- WHERE schemaname = 'public'
--   AND n_dead_tup > 0
-- ORDER BY dead_percentage DESC;
-- =====================================================
