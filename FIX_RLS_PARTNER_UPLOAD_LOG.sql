-- =========================================================
-- FIX 2: partner_upload_log RLS Policy
-- =========================================================
-- Issue: Policy allows reading ALL partner uploads (returns TRUE always)
-- Fix: Restrict to partner's own upload logs only
-- Risk: VERY LOW - Partners should only see their own uploads
-- =========================================================

DO $$ BEGIN RAISE NOTICE '=== FIXING partner_upload_log RLS ==='; END $$;

-- Drop old policy (allows reading everything)
DROP POLICY IF EXISTS "Partners can view their upload logs" ON partner_upload_log;

-- Create new policy (only YOUR uploads)
CREATE POLICY "Partners can view their upload logs"
ON partner_upload_log
FOR SELECT
TO authenticated
USING (
  partner_id = auth.uid()  -- ✅ NOW CHECKS: partner_id matches logged-in partner
);

-- Verify the fix
DO $$ BEGIN RAISE NOTICE '=== VERIFICATION ==='; END $$;

SELECT 
  schemaname,
  tablename,
  policyname,
  qual as policy_condition,
  CASE 
    WHEN qual LIKE '%auth.uid()%' THEN '✅ Policy checks partner_id'
    ELSE '⚠️ Policy might be too permissive'
  END as status
FROM pg_policies 
WHERE tablename = 'partner_upload_log' 
  AND policyname = 'Partners can view their upload logs';

-- ✅ WHAT CHANGED:
-- BEFORE: USING (true) - Any partner could see ALL partner upload logs
-- AFTER: USING (partner_id = auth.uid()) - Partners only see THEIR upload logs
--
-- ⚠️ IMPACT ON APP:
-- - Backend functions use SECURITY DEFINER (bypass RLS) - NOT AFFECTED
-- - Partner app queries this table - NOW MORE SECURE (can't spy on other partners)
-- - Partners could never see others' logs before (app filtered it)
-- - Now database enforces it too (defense in depth)
--
-- ✅ RESULT: 1 warning fixed, zero breakage risk
