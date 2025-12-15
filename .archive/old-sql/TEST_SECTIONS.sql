-- Run this to find EXACTLY where the error happens
-- If a section fails, that's where the problem is!

-- SECTION 1: Test user_bans (should work)
BEGIN;
DROP POLICY IF EXISTS "Admins can view all bans" ON public.user_bans;
CREATE POLICY "Admins can view all bans" ON public.user_bans
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  )
);
ROLLBACK;
SELECT 'Section 1: user_bans - SUCCESS' as result;

-- SECTION 2: Test user_stats (should work)
BEGIN;
DROP POLICY IF EXISTS "user_stats_select_own" ON public.user_stats;
CREATE POLICY "user_stats_select_own" ON public.user_stats
FOR SELECT USING (user_id = (SELECT auth.uid()));
ROLLBACK;
SELECT 'Section 2: user_stats - SUCCESS' as result;

-- SECTION 3: Test app_config
BEGIN;
DROP POLICY IF EXISTS "Anyone can read app_config" ON public.app_config;
CREATE POLICY "Anyone can read app_config" ON public.app_config
FOR SELECT USING (true);
ROLLBACK;
SELECT 'Section 3: app_config - SUCCESS' as result;

-- SECTION 4: Test flagged_content  
BEGIN;
DROP POLICY IF EXISTS "Users can view their own flags" ON public.flagged_content;
CREATE POLICY "Users can view their own flags" ON public.flagged_content
FOR SELECT USING (user_id = (SELECT auth.uid()));
ROLLBACK;
SELECT 'Section 4: flagged_content - SUCCESS' as result;

-- SECTION 5: Test users table
BEGIN;
DROP POLICY IF EXISTS "users_can_read_own_or_public" ON public.users;
CREATE POLICY "users_can_read_own_or_public" ON public.users
FOR SELECT USING (id = (SELECT auth.uid()) OR is_public = true);
ROLLBACK;
SELECT 'Section 5: users - SUCCESS' as result;

-- SECTION 6: Test referral_tracking
BEGIN;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referral_tracking;
CREATE POLICY "referral_tracking_manage" ON public.referral_tracking
FOR ALL USING (
  referrer_id = (SELECT auth.uid()) OR
  referred_id = (SELECT auth.uid()) OR
  (SELECT auth.role()) = 'service_role'
);
ROLLBACK;
SELECT 'Section 6: referral_tracking - SUCCESS' as result;
