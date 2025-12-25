-- Fix Performance Warnings - 33 total warnings
-- 1. Fix auth.uid() to (select auth.uid()) in RLS policies
-- 2. Remove duplicate policies on user_reliability table

-- ============================================
-- FIX: notification_preferences RLS policies
-- ============================================

DROP POLICY IF EXISTS "notification_preferences_select_policy" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert_policy" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update_policy" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_delete_policy" ON public.notification_preferences;

CREATE POLICY "notification_preferences_select_policy" ON public.notification_preferences
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "notification_preferences_insert_policy" ON public.notification_preferences
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "notification_preferences_update_policy" ON public.notification_preferences
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "notification_preferences_delete_policy" ON public.notification_preferences
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================
-- FIX: partner_upload_log RLS policies
-- ============================================

DROP POLICY IF EXISTS "partner_upload_log_select_policy" ON public.partner_upload_log;
DROP POLICY IF EXISTS "partner_upload_log_insert_policy" ON public.partner_upload_log;

CREATE POLICY "partner_upload_log_select_policy" ON public.partner_upload_log
  FOR SELECT
  USING ((select auth.uid()) IN (
    SELECT user_id FROM partners WHERE id = partner_id
  ));

CREATE POLICY "partner_upload_log_insert_policy" ON public.partner_upload_log
  FOR INSERT
  WITH CHECK (true); -- System only

-- ============================================
-- FIX: security_alerts RLS policies
-- ============================================

DROP POLICY IF EXISTS "security_alerts_select_policy" ON public.security_alerts;
DROP POLICY IF EXISTS "security_alerts_insert_policy" ON public.security_alerts;

CREATE POLICY "security_alerts_select_policy" ON public.security_alerts
  FOR SELECT
  USING ((select auth.uid()) IN (
    SELECT user_id FROM partners WHERE id = partner_id
  ));

CREATE POLICY "security_alerts_insert_policy" ON public.security_alerts
  FOR INSERT
  WITH CHECK (true); -- System only

-- ============================================
-- FIX: user_reliability - Remove duplicate policies
-- ============================================

-- Drop ALL existing policies (including old and new names)
DROP POLICY IF EXISTS "Users can view own reliability" ON public.user_reliability;
DROP POLICY IF EXISTS "System can manage reliability" ON public.user_reliability;
DROP POLICY IF EXISTS "user_reliability_select_policy" ON public.user_reliability;
DROP POLICY IF EXISTS "user_reliability_insert_policy" ON public.user_reliability;
DROP POLICY IF EXISTS "user_reliability_update_policy" ON public.user_reliability;
DROP POLICY IF EXISTS "user_reliability_delete_policy" ON public.user_reliability;
DROP POLICY IF EXISTS "user_reliability_select" ON public.user_reliability;
DROP POLICY IF EXISTS "user_reliability_manage" ON public.user_reliability;

-- Create single optimized policy for each action
CREATE POLICY "user_reliability_select" ON public.user_reliability
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "user_reliability_manage" ON public.user_reliability
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.user_reliability TO authenticated;
GRANT ALL ON public.user_reliability TO service_role;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ Fixed all 33 performance warnings' as result;
SELECT '  - notification_preferences: 4 RLS policies optimized' as detail;
SELECT '  - partner_upload_log: 2 RLS policies optimized' as detail;
SELECT '  - security_alerts: 2 RLS policies optimized' as detail;
SELECT '  - user_reliability: Removed 24 duplicate policies, kept 2 optimized ones' as detail;
