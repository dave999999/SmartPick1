-- ============================================================================
-- Verify Function Security Settings
-- Run this regularly to catch functions with security issues
-- ============================================================================

-- 1. Find all functions missing search_path (THE MAIN ISSUE)
SELECT 
  'MISSING SEARCH_PATH' as issue_type,
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prosecdef THEN '⚠️ SECURITY DEFINER (VULNERABLE!)'
    ELSE 'SECURITY INVOKER (lower risk)'
  END as security_mode,
  'Add: SET search_path = public, pg_temp' as fix
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'  -- Only functions
  AND (
    p.proconfig IS NULL 
    OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    )
  )
ORDER BY 
  p.prosecdef DESC,  -- Security definer first (highest priority)
  p.proname;

-- ============================================================================

-- 2. List all SECURITY DEFINER functions (review carefully)
SELECT 
  'SECURITY DEFINER REVIEW' as check_type,
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE 
    WHEN p.proconfig IS NULL THEN '❌ NO search_path'
    WHEN EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    ) THEN '✅ Has search_path: ' || array_to_string(p.proconfig, ', ')
    ELSE '❌ NO search_path'
  END as security_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.prosecdef = true  -- Only SECURITY DEFINER
ORDER BY 
  CASE 
    WHEN p.proconfig IS NULL THEN 0
    ELSE 1
  END,
  p.proname;

-- ============================================================================

-- 3. List all functions with their full details
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns,
  l.lanname as language,
  CASE 
    WHEN p.prosecdef THEN '🔒 SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security,
  COALESCE(array_to_string(p.proconfig, E'\n'), 'None') as config,
  CASE
    WHEN p.prosecdef AND p.proconfig IS NULL THEN '❌ VULNERABLE'
    WHEN p.prosecdef AND EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS c
      WHERE c LIKE 'search_path=%'
    ) THEN '✅ SECURE'
    ELSE 'ℹ️ OK (not security definer)'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY 
  CASE 
    WHEN p.prosecdef AND p.proconfig IS NULL THEN 0
    WHEN p.prosecdef THEN 1
    ELSE 2
  END,
  p.proname;

-- ============================================================================

-- 4. Check for common issues
SELECT 
  'COMMON ISSUES CHECK' as report_type,
  COUNT(*) FILTER (WHERE prosecdef AND proconfig IS NULL) as vulnerable_functions,
  COUNT(*) FILTER (WHERE prosecdef) as total_security_definer,
  COUNT(*) as total_public_functions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE prosecdef AND proconfig IS NULL) / 
    NULLIF(COUNT(*) FILTER (WHERE prosecdef), 0),
    1
  ) as percent_vulnerable
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f';

-- ============================================================================

-- 5. Get function source code for manual review (uncomment to use)
-- Replace 'function_name' with actual function name
/*
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'your_function_name';
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- If you see functions in the "MISSING SEARCH_PATH" section:
--   1. Copy the function definition using pg_get_functiondef
--   2. Add: SET search_path = public, pg_temp
--   3. Replace uid() with auth.uid()
--   4. Replace table_name with public.table_name
--   5. Test the function
--   6. Rerun this script to verify
-- ============================================================================
