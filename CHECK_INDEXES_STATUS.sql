-- ============================================
-- CHECK IF PERFORMANCE INDEXES ARE APPLIED
-- Run this in Supabase SQL Editor to verify
-- ============================================

-- 1. Check if key indexes exist
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_offers_active_expires') 
        THEN '✅ Applied'
        ELSE '❌ MISSING - Apply migration now!'
    END as "Offers Active Index",
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reservations_partner_status') 
        THEN '✅ Applied'
        ELSE '❌ MISSING - Apply migration now!'
    END as "Reservations Partner Index",
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_stats_streaks') 
        THEN '✅ Applied'
        ELSE '❌ MISSING - Apply migration now!'
    END as "User Stats Index",
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reservations_qr_code') 
        THEN '✅ Applied'
        ELSE '❌ MISSING - Apply migration now!'
    END as "QR Code Index";

-- 2. List all existing performance indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_offers_%' OR
    indexname LIKE 'idx_reservations_%' OR
    indexname LIKE 'idx_user_%' OR
    indexname LIKE 'idx_partners_%'
  )
ORDER BY tablename, indexname;

-- 3. Check for tables with NO indexes (high risk!)
SELECT 
    t.tablename,
    COUNT(i.indexname) as index_count
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename AND i.schemaname = 'public'
WHERE t.schemaname = 'public'
  AND t.tablename IN ('offers', 'reservations', 'user_stats', 'user_achievements', 'partners', 'users')
GROUP BY t.tablename
HAVING COUNT(i.indexname) < 3
ORDER BY index_count ASC;

-- 4. Check index usage statistics (queries per index)
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as "Times Used",
    pg_size_pretty(pg_relation_size(indexrelid)) AS "Index Size"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname IN ('offers', 'reservations', 'user_stats', 'user_achievements')
ORDER BY idx_scan DESC
LIMIT 20;

-- 5. Identify slow queries (sequential scans)
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
