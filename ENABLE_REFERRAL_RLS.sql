-- Migration: Enable RLS for Referral Tables
-- Date: 2025-11-20
-- Purpose: Safely enable Row Level Security on referral_tracking and referral_limits tables

BEGIN;

-- ===================================================================
-- PART 1: Enable RLS on referral_tracking
-- ===================================================================

-- Enable RLS
ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;

-- Policy 1: Referrers can view their own referrals
CREATE POLICY "Users can view their own referrals"
  ON public.referral_tracking
  FOR SELECT
  USING (auth.uid() = referrer_id);

-- Policy 2: Referred users can view their referral record
CREATE POLICY "Users can view records where they were referred"
  ON public.referral_tracking
  FOR SELECT
  USING (auth.uid() = referred_user_id);

-- Policy 3: System/service role can do everything (for Edge Functions)
-- This allows backend operations to continue working
CREATE POLICY "Service role has full access to referral tracking"
  ON public.referral_tracking
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy 4: Users can insert their own referral records (when claiming a code)
-- This is needed when a new user signs up with a referral code
CREATE POLICY "Users can create referral records when being referred"
  ON public.referral_tracking
  FOR INSERT
  WITH CHECK (auth.uid() = referred_user_id);

-- ===================================================================
-- PART 2: Enable RLS on referral_limits
-- ===================================================================

-- Enable RLS
ALTER TABLE public.referral_limits ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own limits
CREATE POLICY "Users can view their own referral limits"
  ON public.referral_limits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Service role has full access (for admin operations)
CREATE POLICY "Service role has full access to referral limits"
  ON public.referral_limits
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy 3: Users can update their own limits (read-only fields like restrictions are service_role only)
-- This policy is intentionally restrictive - only service can modify
-- CREATE POLICY "Users cannot modify their own limits"
--   ON public.referral_limits
--   FOR UPDATE
--   USING (false);

-- ===================================================================
-- VERIFICATION QUERIES (run these after migration to confirm)
-- ===================================================================

-- Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'referral_tracking' AND relnamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'RLS not enabled on referral_tracking';
  END IF;
  
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'referral_limits' AND relnamespace = 'public'::regnamespace) THEN
    RAISE EXCEPTION 'RLS not enabled on referral_limits';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on both tables';
END $$;

-- Count policies created
DO $$
DECLARE
  tracking_policies INT;
  limits_policies INT;
BEGIN
  SELECT COUNT(*) INTO tracking_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'referral_tracking';
  
  SELECT COUNT(*) INTO limits_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'referral_limits';
  
  RAISE NOTICE 'referral_tracking policies: %', tracking_policies;
  RAISE NOTICE 'referral_limits policies: %', limits_policies;
END $$;

COMMIT;

-- ===================================================================
-- ROLLBACK SCRIPT (if needed)
-- ===================================================================
-- Run this if something goes wrong:
/*
BEGIN;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referral_tracking;
DROP POLICY IF EXISTS "Users can view records where they were referred" ON public.referral_tracking;
DROP POLICY IF EXISTS "Service role has full access to referral tracking" ON public.referral_tracking;
DROP POLICY IF EXISTS "Users can create referral records when being referred" ON public.referral_tracking;
DROP POLICY IF EXISTS "Users can view their own referral limits" ON public.referral_limits;
DROP POLICY IF EXISTS "Service role has full access to referral limits" ON public.referral_limits;
ALTER TABLE public.referral_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_limits DISABLE ROW LEVEL SECURITY;
COMMIT;
*/
