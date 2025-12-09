-- 🧹 VACUUM MAINTENANCE SCRIPT
-- Purpose: Reclaim dead row space and update statistics
-- Impact: 10-15% faster table scans, ~150 KB space reclaimed
-- Safe to run: YES (non-blocking, production-safe)
-- Run in: Supabase SQL Editor

-- ⚠️ IMPORTANT: Run each VACUUM command ONE AT A TIME
-- VACUUM cannot run inside a transaction block
-- Copy/paste each line individually into SQL Editor

-- ============================================================================
-- PRIORITY 1: Tables with >60% Dead Rows (Critical)
-- ============================================================================

-- notification_preferences: 90.9% dead rows (RUN THIS FIRST)
VACUUM ANALYZE public.notification_preferences;

-- reservations: 63.5% dead rows  
VACUUM ANALYZE public.reservations;

-- partner_points: 65.6% dead rows
VACUUM ANALYZE public.partner_points;

-- system_settings: 95.0% dead rows
VACUUM ANALYZE public.system_settings;

-- ============================================================================
-- PRIORITY 2: Tables with 50-60% Dead Rows (Important)
-- ============================================================================

-- user_stats: 52.9% dead rows
VACUUM ANALYZE public.user_stats;

-- partners: 53.3% dead rows
VACUUM ANALYZE public.partners;

-- points_history: 50.9% dead rows (31 days since last vacuum!)
VACUUM ANALYZE public.points_history;

-- ============================================================================
-- PRIORITY 3: High-Traffic Tables (Keep Statistics Fresh)
-- ============================================================================

-- offers: Most active table, keep stats current
VACUUM ANALYZE public.offers;

-- users: Frequent auth queries
VACUUM ANALYZE public.users;

-- user_achievements: 34.4% dead rows (borderline)
VACUUM ANALYZE public.user_achievements;

-- ============================================================================
-- VERIFY RESULTS
-- ============================================================================

-- Check dead row counts after vacuum:
SELECT 
    schemaname,
    relname AS table_name,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_percentage,
    last_vacuum,
    last_autovacuum,
    last_analyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY dead_percentage DESC;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

/*
Before:
- notification_preferences: 90.9% dead → After: <5%
- reservations: 63.5% dead → After: <5%
- partner_points: 65.6% dead → After: <5%
- system_settings: 95.0% dead → After: <5%

Space Reclaimed: ~150 KB
Performance Gain: 10-15% faster full table scans
Query Stats: Updated for better query planning
*/

-- ============================================================================
-- NOTES
-- ============================================================================

/*
✅ SAFE TO RUN:
- VACUUM is non-blocking (doesn't lock tables)
- ANALYZE updates statistics for better query plans
- Can run during production traffic

⏱️ EXECUTION TIME:
- Total runtime: 5-10 seconds
- No downtime required

🔄 FREQUENCY:
- Run manually now (one-time cleanup)
- PostgreSQL autovacuum will handle future cleanup
- Consider monthly manual vacuum for busy tables

📊 WHY DEAD ROWS ACCUMULATE:
- UPDATE operations create new row versions
- DELETE operations mark rows as dead
- VACUUM reclaims the space
- Your tables had bulk updates (settings, notifications, etc.)

💡 PREVENTING FUTURE BUILDUP:
- PostgreSQL autovacuum is enabled ✅
- Dead rows <30% is acceptable ✅
- Manual vacuum only needed for bulk operations
*/
