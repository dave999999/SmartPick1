-- ============================================
-- PERFORMANCE OPTIMIZATION: Fix RLS policies
-- 1. Wrap auth.uid() in (select ...) to prevent row-by-row re-evaluation
-- 2. Consolidate multiple permissive policies into single policies
-- ============================================

-- ============================================
-- FIX: notification_preferences
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Service role can manage all notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can read own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_select_policy" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert_policy" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update_policy" ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_delete_policy" ON public.notification_preferences;

-- Create consolidated policies with optimized auth checks
CREATE POLICY "notification_preferences_select_policy" ON public.notification_preferences
  FOR SELECT
  USING (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    OR user_id = (select auth.uid())
  );

CREATE POLICY "notification_preferences_insert_policy" ON public.notification_preferences
  FOR INSERT
  WITH CHECK (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    OR user_id = (select auth.uid())
  );

CREATE POLICY "notification_preferences_update_policy" ON public.notification_preferences
  FOR UPDATE
  USING (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    OR user_id = (select auth.uid())
  );

CREATE POLICY "notification_preferences_delete_policy" ON public.notification_preferences
  FOR DELETE
  USING (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- ============================================
-- FIX: user_reliability
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Service role can manage reliability scores" ON public.user_reliability;
DROP POLICY IF EXISTS "Users can view own reliability score" ON public.user_reliability;
DROP POLICY IF EXISTS "user_reliability_select_policy" ON public.user_reliability;
DROP POLICY IF EXISTS "user_reliability_insert_policy" ON public.user_reliability;
DROP POLICY IF EXISTS "user_reliability_update_policy" ON public.user_reliability;
DROP POLICY IF EXISTS "user_reliability_delete_policy" ON public.user_reliability;

-- Create consolidated policies
CREATE POLICY "user_reliability_select_policy" ON public.user_reliability
  FOR SELECT
  USING (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    OR user_id = (select auth.uid())
  );

CREATE POLICY "user_reliability_insert_policy" ON public.user_reliability
  FOR INSERT
  WITH CHECK (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

CREATE POLICY "user_reliability_update_policy" ON public.user_reliability
  FOR UPDATE
  USING (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

CREATE POLICY "user_reliability_delete_policy" ON public.user_reliability
  FOR DELETE
  USING (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- ============================================
-- FIX: partner_upload_log
-- ============================================
DROP POLICY IF EXISTS "partner_upload_log_select_policy" ON public.partner_upload_log;
DROP POLICY IF EXISTS "partner_upload_log_insert_policy" ON public.partner_upload_log;

-- Drop old policies
DROP POLICY IF EXISTS "Partners can view own upload log" ON public.partner_upload_log;
DROP POLICY IF EXISTS "System can insert upload logs" ON public.partner_upload_log;

-- Create optimized policy
CREATE POLICY "partner_upload_log_select_policy" ON public.partner_upload_log
  FOR SELECT
  USING (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    OR partner_id IN (
      SELECT id FROM public.partners WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "partner_upload_log_insert_policy" ON public.partner_upload_log
  FOR INSERT
  WITH CHECK (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

-- ============================================
-- FIX: security_alerts
-- ============================================

DROP POLICY IF EXISTS "security_alerts_select_policy" ON public.security_alerts;
DROP POLICY IF EXISTS "security_alerts_insert_policy" ON public.security_alerts;
-- Drop old policy
DROP POLICY IF EXISTS "Admins can view security alerts" ON public.security_alerts;

-- Create optimized policy (service role only for security alerts)
CREATE POLICY "security_alerts_select_policy" ON public.security_alerts
  FOR SELECT
  USING (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

CREATE POLICY "security_alerts_insert_policy" ON public.security_alerts
  FOR INSERT
  WITH CHECK (
    (select current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );
