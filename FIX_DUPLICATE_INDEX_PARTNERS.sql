-- =====================================================
-- FIX: Remove duplicate index on partners table
-- =====================================================
-- Problem: Two identical indexes exist:
--   - idx_partners_approved (from 20251111_performance_add_missing_indexes.sql)
--   - idx_partners_status_approved (from APPLY_DATABASE_INDEXES.sql)
-- Both create: CREATE INDEX ON partners(status) WHERE status = 'APPROVED'
-- Solution: Drop idx_partners_status_approved, keep idx_partners_approved
-- =====================================================

-- Drop the duplicate index
DROP INDEX IF EXISTS public.idx_partners_status_approved;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify only idx_partners_approved remains
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'partners'
  AND indexname IN ('idx_partners_approved', 'idx_partners_status_approved')
ORDER BY indexname;

-- Expected result: Only idx_partners_approved should exist

-- Show all partner indexes for context
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'partners'
  AND schemaname = 'public'
ORDER BY indexname;
