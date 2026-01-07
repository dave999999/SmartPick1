-- =========================================================
-- FIX PERFORMANCE: RLS Policy Optimization
-- =========================================================
-- Issue: auth.uid() re-evaluated for each row (slow)
-- Fix: Use (select auth.uid()) - evaluated once per query
-- Risk: ZERO - Just performance optimization, same logic
-- =========================================================

DO $$ BEGIN RAISE NOTICE '=== OPTIMIZING RLS POLICIES FOR PERFORMANCE ==='; END $$;

-- 1. notification_queue - SELECT policy (Partners can view)
DROP POLICY IF EXISTS "Partners can view their notification queue" ON notification_queue;
CREATE POLICY "Partners can view their notification queue"
ON notification_queue
FOR SELECT
TO authenticated
USING (partner_id = (select auth.uid()));  -- ✅ OPTIMIZED: Evaluate once per query

-- 2. notification_queue - INSERT policy
DROP POLICY IF EXISTS "notification_queue_insert_policy" ON notification_queue;
CREATE POLICY "notification_queue_insert_policy"
ON notification_queue
FOR INSERT
TO authenticated
WITH CHECK (partner_id = (select auth.uid()));  -- ✅ OPTIMIZED: Evaluate once per query

-- 3. partner_upload_log - SELECT policy (Partners can view)
DROP POLICY IF EXISTS "Partners can view their upload logs" ON partner_upload_log;
CREATE POLICY "Partners can view their upload logs"
ON partner_upload_log
FOR SELECT
TO authenticated
USING (partner_id = (select auth.uid()));  -- ✅ OPTIMIZED: Evaluate once per query

-- 4. partner_upload_log - INSERT policy
DROP POLICY IF EXISTS "partner_upload_log_insert_policy" ON partner_upload_log;
CREATE POLICY "partner_upload_log_insert_policy"
ON partner_upload_log
FOR INSERT
TO authenticated
WITH CHECK (partner_id = (select auth.uid()));  -- ✅ OPTIMIZED: Evaluate once per query

-- Verify the fixes
DO $$ BEGIN RAISE NOTICE '=== VERIFICATION ==='; END $$;

SELECT 
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%(select auth.uid())%' THEN '✅ OPTIMIZED (SELECT)'
    WHEN with_check LIKE '%(select auth.uid())%' THEN '✅ OPTIMIZED (INSERT)'
    ELSE '⚠️ NOT OPTIMIZED'
  END as status
FROM pg_policies 
WHERE tablename IN ('notification_queue', 'partner_upload_log')
  AND policyname IN (
    'Partners can view their notification queue',
    'notification_queue_insert_policy',
    'Partners can view their upload logs',
    'partner_upload_log_insert_policy'
  );

-- ✅ WHAT CHANGED:
-- BEFORE: auth.uid() - Called for EVERY row (1000 rows = 1000 calls)
-- AFTER: (select auth.uid()) - Called ONCE per query (1000 rows = 1 call)
--
-- ⚠️ IMPACT ON APP:
-- - Logic is IDENTICAL - same security, same behavior
-- - Just much faster on large result sets
-- - Zero breaking changes
--
-- ✅ RESULT: 4 performance warnings fixed, queries faster, zero breakage
