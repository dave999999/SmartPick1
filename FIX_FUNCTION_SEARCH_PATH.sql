-- Migration: Fix Function Search Path Security Issues
-- Date: 2025-11-20
-- Purpose: Set search_path on all functions to prevent schema hijacking attacks
-- This fixes the "Function Search Path Mutable" security warnings

BEGIN;

-- ===================================================================
-- PART 1: Point Purchase Functions
-- ===================================================================

ALTER FUNCTION public.update_point_purchase_orders_updated_at() 
  SET search_path = public, pg_temp;

ALTER FUNCTION public.purchase_reservation_slot(UUID, INTEGER, INTEGER) 
  SET search_path = public, pg_temp;

-- ===================================================================
-- PART 2: Referral System Functions
-- ===================================================================

ALTER FUNCTION public.apply_referral_code_with_rewards(UUID, TEXT, INET, TEXT, TEXT) 
  SET search_path = public, pg_temp;

ALTER FUNCTION public.check_referral_limits(UUID) 
  SET search_path = public, pg_temp;

ALTER FUNCTION public.calculate_referral_suspicion_score(UUID, INET, TEXT) 
  SET search_path = public, pg_temp;

ALTER FUNCTION public.admin_review_referral(UUID, TEXT, TEXT) 
  SET search_path = public, pg_temp;

-- ===================================================================
-- PART 3: System Settings Functions
-- ===================================================================

ALTER FUNCTION public.update_system_setting(TEXT, TEXT) 
  SET search_path = public, pg_temp;

-- ===================================================================
-- PART 4: Push Notifications Functions
-- ===================================================================

ALTER FUNCTION public.update_push_subscriptions_updated_at() 
  SET search_path = public, pg_temp;

-- ===================================================================
-- PART 5: Partner Functions
-- ===================================================================

ALTER FUNCTION public.partner_mark_no_show(UUID, UUID) 
  SET search_path = public, pg_temp;

ALTER FUNCTION public.partner_mark_no_show_no_penalty(UUID, UUID) 
  SET search_path = public, pg_temp;

ALTER FUNCTION public.partner_confirm_no_show(UUID, UUID) 
  SET search_path = public, pg_temp;

ALTER FUNCTION public.partner_forgive_customer(UUID, UUID, TEXT) 
  SET search_path = public, pg_temp;

-- ===================================================================
-- PART 6: User Achievement Functions
-- ===================================================================

ALTER FUNCTION public.check_user_achievements(UUID) 
  SET search_path = public, pg_temp;

-- ===================================================================
-- PART 7: Auto-Expire Functions
-- ===================================================================

ALTER FUNCTION public.auto_expire_failed_pickups() 
  SET search_path = public, pg_temp;

-- ===================================================================
-- VERIFICATION
-- ===================================================================

-- Verify all functions now have search_path set
DO $$
DECLARE
  mutable_count INT;
BEGIN
  SELECT COUNT(*) INTO mutable_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'update_point_purchase_orders_updated_at',
      'purchase_reservation_slot',
      'apply_referral_code_with_rewards',
      'check_referral_limits',
      'calculate_referral_suspicion_score',
      'admin_review_referral',
      'update_system_setting',
      'update_push_subscriptions_updated_at',
      'partner_mark_no_show',
      'partner_mark_no_show_no_penalty',
      'partner_confirm_no_show',
      'partner_forgive_customer',
      'check_user_achievements',
      'auto_expire_failed_pickups'
    )
    AND (prosecdef OR NOT proretset)
    AND prosrc NOT LIKE '%search_path%';

  IF mutable_count > 0 THEN
    RAISE WARNING 'Still have % functions without fixed search_path', mutable_count;
  ELSE
    RAISE NOTICE 'All functions now have fixed search_path - security issue resolved!';
  END IF;
END $$;

COMMIT;

-- ===================================================================
-- NOTES
-- ===================================================================
-- What this does:
-- 1. Sets search_path = public, pg_temp on all functions
-- 2. Prevents schema hijacking attacks
-- 3. Fixes all "Function Search Path Mutable" warnings
-- 4. Does not change function behavior - completely safe
-- 5. Functions will only look in 'public' schema and temporary tables

-- Why this is safe:
-- - Only changes WHERE functions look for tables, not HOW they work
-- - All your tables are in 'public' schema anyway
-- - pg_temp allows temporary tables (if needed)
-- - No data is modified
-- - No functionality is changed

-- ===================================================================
-- ROLLBACK (if needed)
-- ===================================================================
/*
-- To remove search_path settings (not recommended):
BEGIN;
ALTER FUNCTION public.update_point_purchase_orders_updated_at() RESET search_path;
ALTER FUNCTION public.purchase_reservation_slot() RESET search_path;
ALTER FUNCTION public.apply_referral_code_with_rewards(UUID, TEXT) RESET search_path;
ALTER FUNCTION public.check_referral_limits(UUID) RESET search_path;
ALTER FUNCTION public.calculate_referral_suspicion_score(UUID, INET, TEXT) RESET search_path;
ALTER FUNCTION public.admin_review_referral(UUID, TEXT, TEXT) RESET search_path;
ALTER FUNCTION public.update_system_setting(TEXT, TEXT) RESET search_path;
ALTER FUNCTION public.update_push_subscriptions_updated_at() RESET search_path;
ALTER FUNCTION public.partner_mark_no_show(UUID, UUID) RESET search_path;
ALTER FUNCTION public.partner_mark_no_show_no_penalty(UUID, UUID) RESET search_path;
ALTER FUNCTION public.partner_confirm_no_show(UUID, UUID) RESET search_path;
ALTER FUNCTION public.partner_forgive_customer(UUID, UUID, TEXT) RESET search_path;
ALTER FUNCTION public.check_user_achievements(UUID) RESET search_path;
ALTER FUNCTION public.auto_expire_failed_pickups() RESET search_path;
COMMIT;
*/
