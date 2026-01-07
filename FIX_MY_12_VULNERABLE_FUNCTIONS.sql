-- ============================================================================
-- QUICK FIX: Your 12 Vulnerable Functions
-- Run this to get the exact list and their definitions
-- ============================================================================

-- STEP 1: Get the names of all 12 vulnerable functions
SELECT 
  ROW_NUMBER() OVER (ORDER BY p.proname) as "#",
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.prosecdef = true
  AND (
    p.proconfig IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    )
  )
ORDER BY p.proname;

-- ============================================================================
-- STEP 2: Get the source code for ALL 12 functions at once
-- Copy this output and we'll fix them in batch
-- ============================================================================

SELECT 
  '-- ============================================================================' || E'\n' ||
  '-- Function #' || ROW_NUMBER() OVER (ORDER BY p.proname) || ': ' || p.proname || E'\n' ||
  '-- ============================================================================' || E'\n' ||
  pg_get_functiondef(p.oid) || E'\n\n'
  as function_definitions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.prosecdef = true
  AND (
    p.proconfig IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    )
  )
ORDER BY p.proname;

-- ============================================================================
-- STEP 3: Apply the fixes below
-- For each function, add the two critical changes:
-- 1. Add: SET search_path = public, pg_temp
-- 2. Fix any uid() → auth.uid() and table_name → public.table_name
-- ============================================================================

-- Paste the output from STEP 2 here, then modify each function:

-- Before modification pattern:
-- CREATE OR REPLACE FUNCTION public.function_name(...)
-- RETURNS ...
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- BEGIN
--   ...
-- END;
-- $$;

-- After modification pattern:
-- CREATE OR REPLACE FUNCTION public.function_name(...)
-- RETURNS ...
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public, pg_temp  -- ADD THIS LINE
-- AS $$
-- BEGIN
--   ... (fix uid() and table names)
-- END;
-- $$;

-- ============================================================================
-- YOUR 12 FUNCTIONS TO FIX (paste from STEP 2 and modify):
-- ============================================================================

-- [Paste and fix here]

-- ============================================================================
-- STEP 4: After pasting all 12 fixed functions above, execute this entire file
-- ============================================================================

-- ============================================================================
-- STEP 5: Verify all are fixed
-- ============================================================================

-- Run this to confirm all 12 are now secure:
SELECT 
  COUNT(*) as remaining_vulnerable_functions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.prosecdef = true
  AND (
    p.proconfig IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    )
  );

-- Expected result: remaining_vulnerable_functions = 0

-- ============================================================================
-- QUICK REFERENCE FOR FIXES
-- ============================================================================

-- Common changes needed:
-- 
-- 1. ADD this line after SECURITY DEFINER:
--    SET search_path = public, pg_temp
--
-- 2. CHANGE these patterns:
--    uid()                    to auth.uid()
--    users                    to public.users
--    reservations             to public.reservations
--    offers                   to public.offers
--    cancellation_tracking    to public.cancellation_tracking
--    points_history           to public.points_history
--    user_stats               to public.user_stats
--    achievements             to public.achievements
--    partners                 to public.partners
--    uuid_generate_v4()       to extensions.uuid_generate_v4()
--    (any other table)        to public.(table_name)

-- ============================================================================
