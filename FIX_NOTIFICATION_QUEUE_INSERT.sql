-- =========================================================
-- FIX: notification_queue INSERT Policy (Make it Safer)
-- =========================================================
-- Issue: WITH CHECK (true) allows inserting ANY partner_id
-- Fix: Only allow inserting YOUR OWN notifications
-- Risk: VERY LOW - App already passes correct partner_id
-- =========================================================

DO $$ BEGIN RAISE NOTICE '=== FIXING notification_queue INSERT RLS ==='; END $$;

-- Drop old policy (allows inserting any partner_id)
DROP POLICY IF EXISTS "notification_queue_insert_policy" ON notification_queue;

-- Create new policy (can only insert YOUR notifications)
CREATE POLICY "notification_queue_insert_policy"
ON notification_queue
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
WHERE tablename = 'notification_queue' 
  AND policyname = 'notification_queue_insert_policy';

-- ✅ WHAT CHANGED:
-- BEFORE: WITH CHECK (true) - Any user could insert notifications for ANY partner
-- AFTER: WITH CHECK (partner_id = auth.uid()) - Partners can only insert THEIR notifications
--
-- ⚠️ IMPACT ON APP:
-- - App already passes correct partner_id when inserting - NOT AFFECTED
-- - Prevents malicious users from inserting fake notifications for other partners
-- - More secure, same functionality
--
-- ✅ RESULT: 1 warning fixed, improved security, zero breakage risk
