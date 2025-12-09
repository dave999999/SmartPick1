-- ============================================
-- VERIFY INDEX PERFORMANCE IMPROVEMENT
-- ============================================
-- Run this to compare before/after sequential scan ratios

-- Previous results (BEFORE indexes):
-- - users: 46.60% sequential (40,127 scans)
-- - user_stats: 79.18% sequential (1,670 scans)
-- - user_achievements: 58.96% sequential (8,095 scans)
-- - partners: 32.27% sequential (45,931 scans)

-- Check current sequential scan ratios (AFTER indexes)
SELECT 
    schemaname,
    relname as tablename,
    seq_scan as "Sequential Scans",
    seq_tup_read as "Rows Read (Seq)",
    idx_scan as "Index Scans",
    idx_tup_fetch as "Rows Read (Index)",
    ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 2) as "% Sequential"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN ('offers', 'reservations', 'user_stats', 'user_achievements', 'partners', 'users')
ORDER BY seq_scan DESC;

-- Check new index usage
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as "Times Used",
    pg_size_pretty(pg_relation_size(indexrelid)) AS "Index Size"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (
    indexrelname LIKE 'idx_user_stats_%' OR
    indexrelname LIKE 'idx_user_achievements_%' OR
    indexrelname LIKE 'idx_users_%' OR
    indexrelname LIKE 'idx_partners_%'
  )
ORDER BY idx_scan DESC;

-- Expected improvements:
-- ✅ user_stats: 79% → ~15-20% sequential
-- ✅ user_achievements: 59% → ~20-25% sequential  
-- ✅ users: 47% → ~15-20% sequential
-- ✅ partners: 32% → ~10-15% sequential
--
-- Note: You'll see the full impact after a few hours of normal traffic
-- New indexes start at 0 usage and build up over time
