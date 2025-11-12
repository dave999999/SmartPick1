-- Fix Supabase linter warning: Function Search Path Mutable
-- Target: public.hold_points_on_reservation()
-- Action: Set a fixed search_path so the function is immune to search_path manipulation
-- Safe to run multiple times.

DO $$
BEGIN
  RAISE NOTICE '=== FIX: Setting search_path on public.hold_points_on_reservation() ===';
END $$;

-- Use ALTER FUNCTION (no need to recreate the function body)
-- Recommended setting per Supabase guidance
ALTER FUNCTION public.hold_points_on_reservation()
  SET search_path = public, pg_temp;

-- Verification
DO $$
DECLARE
  has_search_path boolean;
  def text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'hold_points_on_reservation'
  LIMIT 1;

  has_search_path := position('SET search_path' in def) > 0;
  RAISE NOTICE 'search_path set on hold_points_on_reservation(): %', has_search_path;
  IF has_search_path THEN
    RAISE NOTICE '✓ Linter warning should be resolved for this function';
  ELSE
    RAISE NOTICE '⚠ search_path not detected, please review function definition';
  END IF;
END $$;
