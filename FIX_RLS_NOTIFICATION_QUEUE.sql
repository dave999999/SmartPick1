-- =========================================================
-- FIX 1: notification_queue RLS Policy
-- =========================================================
-- Issue: Policy allows reading ALL notifications (returns TRUE always)
-- Fix: Restrict to user's own notifications only
-- Risk: VERY LOW - Backend doesn't use this table via RLS
-- =========================================================

DO $$ BEGIN RAISE NOTICE '=== FIXING notification_queue RLS ==='; END $$;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their notification queue" ON notification_queue;
DROP POLICY IF EXISTS "notification_queue_no_select" ON notification_queue;

-- Create new policy (partners can view THEIR notifications only)
CREATE POLICY "Partners can view their notification queue"
ON notification_queue
FOR SELECT
TO authenticated
USING (partner_id = auth.uid());  -- ✅ NOW CHECKS: partner_id matches logged-in partner

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
WHERE tablename = 'notification_queue' 
  AND policyname = 'Partners can view their notification queue';

-- ✅ WHAT CHANGED:
-- BEFORE: USING (false) - Partners couldn't read their own notifications!
-- AFTER: USING (partner_id = auth.uid()) - Partners can see THEIR notifications only
--
-- ⚠️ IMPACT ON APP:
-- - Backend functions use SECURITY DEFINER (bypass RLS) - NOT AFFECTED
-- - Partners can now read their notification queue (previously blocked)
-- - Each partner only sees THEIR notifications (can't spy on others)
-- - Service role still has full access (for processing queue)
--
-- ✅ RESULT: 1 warning fixed, partners can now view their queue
