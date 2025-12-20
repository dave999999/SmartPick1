-- ============================================================================
-- Add RLS Policies for Tables with No Policies
-- Date: 2024-12-21
-- Description: Create appropriate RLS policies for tables that have RLS enabled but no policies
-- ============================================================================

-- ============================================================================
-- 1. ACHIEVEMENTS - Users can view all achievements, claim their own
-- ============================================================================

-- Public can view all achievements (they're just definitions)
DROP POLICY IF EXISTS "achievements_public_read" ON public.achievements;
CREATE POLICY "achievements_public_read"
ON public.achievements
FOR SELECT
TO public
USING (true);

-- Service role has full access (for management)
DROP POLICY IF EXISTS "achievements_service_role_all" ON public.achievements;
CREATE POLICY "achievements_service_role_all"
ON public.achievements
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 2. BANNERS - Public can read active banners, admins can manage
-- ============================================================================

-- Public can view active banners
DROP POLICY IF EXISTS "banners_public_read" ON public.banners;
CREATE POLICY "banners_public_read"
ON public.banners
FOR SELECT
TO public
USING (is_active = true);

-- Service role has full access
DROP POLICY IF EXISTS "banners_service_role_all" ON public.banners;
CREATE POLICY "banners_service_role_all"
ON public.banners
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 3. NOTIFICATIONS - Users can view their own notifications
-- ============================================================================

-- Users can view their own notifications
DROP POLICY IF EXISTS "notifications_user_read" ON public.notifications;
CREATE POLICY "notifications_user_read"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "notifications_user_update" ON public.notifications;
CREATE POLICY "notifications_user_update"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Service role can create and manage notifications
DROP POLICY IF EXISTS "notifications_service_role_all" ON public.notifications;
CREATE POLICY "notifications_service_role_all"
ON public.notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 4. POINTS_HISTORY - Users can view their own points history
-- ============================================================================

-- Users can view their own points history
DROP POLICY IF EXISTS "points_history_user_read" ON public.points_history;
CREATE POLICY "points_history_user_read"
ON public.points_history
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Service role has full access
DROP POLICY IF EXISTS "points_history_service_role_all" ON public.points_history;
CREATE POLICY "points_history_service_role_all"
ON public.points_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 5. PROFILES - Users can view/update their own profile
-- ============================================================================

-- Users can view their own profile
DROP POLICY IF EXISTS "profiles_user_read" ON public.profiles;
CREATE POLICY "profiles_user_read"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_user_update" ON public.profiles;
CREATE POLICY "profiles_user_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Service role has full access
DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
CREATE POLICY "profiles_service_role_all"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 6. BACKEND-ONLY TABLES (No user access)
-- ============================================================================
-- These are logging/monitoring tables - only service_role should access them

-- api_rate_limits - Backend monitoring only
DROP POLICY IF EXISTS "api_rate_limits_service_role_all" ON public.api_rate_limits;
CREATE POLICY "api_rate_limits_service_role_all"
ON public.api_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- notification_log - Backend logging only
DROP POLICY IF EXISTS "notification_log_service_role_all" ON public.notification_log;
CREATE POLICY "notification_log_service_role_all"
ON public.notification_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- trigger_log - Backend debugging only
DROP POLICY IF EXISTS "trigger_log_service_role_all" ON public.trigger_log;
CREATE POLICY "trigger_log_service_role_all"
ON public.trigger_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- user_signup_log - Backend audit only
DROP POLICY IF EXISTS "user_signup_log_service_role_all" ON public.user_signup_log;
CREATE POLICY "user_signup_log_service_role_all"
ON public.user_signup_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check all policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'achievements',
  'api_rate_limits',
  'banners',
  'notification_log',
  'notifications',
  'points_history',
  'profiles',
  'trigger_log',
  'user_signup_log'
)
ORDER BY tablename, policyname;

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'achievements',
  'api_rate_limits',
  'banners',
  'notification_log',
  'notifications',
  'points_history',
  'profiles',
  'trigger_log',
  'user_signup_log'
)
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- 
-- ✅ USER-FACING TABLES (with user access):
-- - achievements: Public read, service_role manages
-- - banners: Public read (active only), service_role manages
-- - notifications: Users see their own, service_role creates
-- - points_history: Users see their own
-- - profiles: Users see/update their own
-- 
-- ✅ BACKEND-ONLY TABLES (service_role only):
-- - api_rate_limits: Monitoring/rate limiting
-- - notification_log: Audit trail
-- - trigger_log: Debugging
-- - user_signup_log: Audit trail
-- 
-- 🔒 SECURITY:
-- All policies use (SELECT auth.uid()) for optimal performance
-- Backend logging tables are completely hidden from users
-- 
-- ============================================================================
