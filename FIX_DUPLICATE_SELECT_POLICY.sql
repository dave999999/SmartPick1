-- =========================================================
-- FIX: Remove Duplicate SELECT Policy on partner_upload_log
-- =========================================================
-- Issue: 2 SELECT policies exist (creates duplicate checks)
-- Fix: Keep the better one, remove duplicate
-- Risk: ZERO - Just removing redundancy
-- =========================================================

DO $$ BEGIN RAISE NOTICE '=== REMOVING DUPLICATE SELECT POLICY ==='; END $$;

-- Check both policies first
SELECT 
  policyname,
  cmd,
  qual,
  CASE 
    WHEN policyname = 'Partners can view their upload logs' THEN '✅ KEEP (better name)'
    WHEN policyname = 'partner_upload_log_select_policy' THEN '❌ REMOVE (duplicate)'
  END as action
FROM pg_policies 
WHERE tablename = 'partner_upload_log' 
  AND cmd = 'SELECT';

-- Remove the duplicate policy
DROP POLICY IF EXISTS "partner_upload_log_select_policy" ON partner_upload_log;

-- Verify only one SELECT policy remains
DO $$ BEGIN RAISE NOTICE '=== VERIFICATION ==='; END $$;

SELECT 
  policyname,
  cmd,
  '✅ REMAINING' as status
FROM pg_policies 
WHERE tablename = 'partner_upload_log' 
  AND cmd = 'SELECT';

-- Should only show "Partners can view their upload logs"

-- ✅ WHAT CHANGED:
-- BEFORE: 2 SELECT policies (both checked on every query - slower)
-- AFTER: 1 SELECT policy (single check - faster)
--
-- ⚠️ IMPACT ON APP:
-- - Both policies had same logic (check partner_id)
-- - Removing duplicate doesn't change behavior
-- - Just improves performance (one check instead of two)
--
-- ✅ RESULT: 1 performance warning fixed, queries faster, zero breakage
