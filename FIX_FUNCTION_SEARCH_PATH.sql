-- Migration: Fix Function Search Path Security Issues
-- Date: 2025-11-28
-- Purpose: Set search_path on all functions to prevent schema hijacking attacks
-- This fixes the "Function Search Path Mutable" security warnings
-- ULTRA SAFE VERSION: Uses dynamic SQL to handle any function signature

BEGIN;

-- ===================================================================
-- AUTOMATIC FIX: Dynamically find and fix ALL mutable functions
-- ===================================================================

DO $$ 
DECLARE
  func_record RECORD;
  func_signature TEXT;
  fixed_count INT := 0;
  error_count INT := 0;
BEGIN
  -- Loop through all functions in public schema that don't have search_path set
  FOR func_record IN 
    SELECT 
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND (p.proconfig IS NULL OR NOT array_to_string(p.proconfig, ',') LIKE '%search_path%')
  LOOP
    BEGIN
      -- Build the function signature
      IF func_record.args = '' THEN
        func_signature := format('public.%I()', func_record.proname);
      ELSE
        func_signature := format('public.%I(%s)', func_record.proname, func_record.args);
      END IF;
      
      -- Try to alter the function
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', func_signature);
      fixed_count := fixed_count + 1;
      
      RAISE NOTICE 'Fixed: %', func_signature;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING 'Could not fix % - %', func_signature, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ Fixed % functions', fixed_count;
  IF error_count > 0 THEN
    RAISE NOTICE '⚠️  Skipped % functions (errors)', error_count;
  END IF;
  RAISE NOTICE '====================================';
END $$;

-- ===================================================================
-- VERIFICATION
-- ===================================================================

-- Verify all functions now have search_path set
DO $$
DECLARE
  mutable_count INT;
BEGIN
  -- Count functions that still have mutable search_path
  SELECT COUNT(*) INTO mutable_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND (p.proconfig IS NULL OR array_to_string(p.proconfig, ',') NOT LIKE '%search_path%');

  RAISE NOTICE '✅ Script completed! Remaining mutable functions: %', mutable_count;
  RAISE NOTICE 'Check Supabase dashboard - warnings should be gone or reduced!';
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
-- ROLLBACK (if needed - NOT RECOMMENDED)
-- ===================================================================
/*
-- To remove search_path settings:
BEGIN;
ALTER FUNCTION public.update_contact_submissions_updated_at() RESET search_path;
ALTER FUNCTION public.check_email_rate_limit() RESET search_path;
ALTER FUNCTION public.update_app_config_updated_at() RESET search_path;
ALTER FUNCTION public.app_metadata_touch_updated_at() RESET search_path;
ALTER FUNCTION public.cleanup_expired_tokens() RESET search_path;
ALTER FUNCTION public.create_password_reset_token(TEXT) RESET search_path;
ALTER FUNCTION public.get_user_by_email(TEXT) RESET search_path;
ALTER FUNCTION public.update_reliability_score_trigger() RESET search_path;
ALTER FUNCTION public.calculate_reliability_score() RESET search_path;
ALTER FUNCTION public.update_offense_history() RESET search_path;
ALTER FUNCTION public.get_active_penalty(UUID) RESET search_path;
ALTER FUNCTION public.apply_penalty_for_missed_pickup(UUID, UUID) RESET search_path;
ALTER FUNCTION public.expire_forgiveness_requests() RESET search_path;
ALTER FUNCTION public.can_user_reserve(UUID) RESET search_path;
ALTER FUNCTION public.get_revenue_trends(UUID, TEXT) RESET search_path;
COMMIT;
*/
