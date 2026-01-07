-- =========================================================
-- FIX: partner_upload_log INSERT Policy
-- =========================================================
-- Issue: Policy allows ANY authenticated user to insert (WITH CHECK true)
-- Fix: Restrict to partner's own uploads only
-- Risk: VERY LOW - Partners should only insert their own logs
-- =========================================================

DO $$ BEGIN RAISE NOTICE '=== FIXING partner_upload_log INSERT RLS ==='; END $$;

-- Drop old policy (allows anyone to insert)
DROP POLICY IF EXISTS "partner_upload_log_insert_policy" ON partner_upload_log;

-- Create new policy (only insert YOUR uploads)
CREATE POLICY "partner_upload_log_insert_policy"
ON partner_upload_log
FOR INSERT
TO authenticated
WITH CHECK (partner_id = auth.uid());  -- ✅ NOW CHECKS: partner_id matches logged-in partner

-- Verify the fix
DO $$ BEGIN RAISE NOTICE '=== VERIFICATION ==='; END $$;

SELECT 
  schemaname,
  tablename,
  policyname,
  with_check as policy_condition,
  CASE 
    WHEN with_check LIKE '%auth.uid()%' THEN '✅ Policy checks partner_id'
    ELSE '⚠️ Policy might be too permissive'
  END as status
FROM pg_policies 
WHERE tablename = 'partner_upload_log' 
  AND policyname = 'partner_upload_log_insert_policy';

-- ✅ WHAT CHANGED:
-- BEFORE: WITH CHECK (true) - Any authenticated user could insert ANY partner's logs
-- AFTER: WITH CHECK (partner_id = auth.uid()) - Partners can only insert THEIR logs
--
-- ⚠️ IMPACT ON APP:
-- - Partner upload function: NOT AFFECTED (already passes correct partner_id)
-- - Prevents malicious users from inserting fake logs for other partners
-- - App behavior unchanged (it already inserts with correct partner_id)
--
-- ✅ RESULT: 1 warning fixed, zero breakage risk
