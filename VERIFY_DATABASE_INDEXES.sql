-- ============================================
-- VERIFY DATABASE INDEXES
-- Purpose: Check which indexes are actually deployed
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check ALL indexes on reservations table
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'reservations'
ORDER BY indexname;

-- 2. Check ALL indexes on offers table
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'offers'
ORDER BY indexname;

-- 3. Check if SPECIFIC indexes exist (from audit report)
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_reservations_status') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as idx_reservations_status,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_reservations_expires_at') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as idx_reservations_expires_at,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_reservations_qr_code') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as idx_reservations_qr_code,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_offers_pickup_window') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as idx_offers_pickup_window;

-- 4. Check QR code index uniqueness
SELECT 
    indexname,
    indexdef,
    CASE 
        WHEN indexdef LIKE '%UNIQUE%' THEN '✅ UNIQUE INDEX'
        ELSE '⚠️ NON-UNIQUE INDEX'
    END as uniqueness_status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename = 'reservations'
  AND indexname LIKE '%qr_code%';

-- 5. Show index usage statistics (how often they're used)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as "Times Used",
    idx_tup_read as "Rows Read",
    idx_tup_fetch as "Rows Fetched",
    pg_size_pretty(pg_relation_size(indexrelid)) AS "Index Size"
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('reservations', 'offers')
ORDER BY idx_scan DESC;

-- 6. Check for missing indexes on frequently queried columns
SELECT 
    'reservations' as table_name,
    'status' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
              AND tablename = 'reservations'
              AND indexdef LIKE '%status%'
        ) THEN '✅ INDEXED'
        ELSE '❌ NOT INDEXED'
    END as status
UNION ALL
SELECT 
    'reservations' as table_name,
    'expires_at' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
              AND tablename = 'reservations'
              AND indexdef LIKE '%expires_at%'
        ) THEN '✅ INDEXED'
        ELSE '❌ NOT INDEXED'
    END as status
UNION ALL
SELECT 
    'offers' as table_name,
    'pickup_start' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
              AND tablename = 'offers'
              AND indexdef LIKE '%pickup_start%'
        ) THEN '✅ INDEXED'
        ELSE '❌ NOT INDEXED'
    END as status
UNION ALL
SELECT 
    'offers' as table_name,
    'pickup_end' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
              AND tablename = 'offers'
              AND indexdef LIKE '%pickup_end%'
        ) THEN '✅ INDEXED'
        ELSE '❌ NOT INDEXED'
    END as status;
