-- ============================================================================
-- STEP-BY-STEP FIXER: Use this to fix vulnerable functions one by one
-- ============================================================================

-- STEP 1: Find all vulnerable functions
-- Copy output for reference
SELECT 
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
-- STEP 2: Get the current definition of ONE function
-- Replace 'your_function_name' with actual name from step 1
-- ============================================================================

-- UNCOMMENT AND RUN THIS:
/*
SELECT pg_get_functiondef(p.oid) as current_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'your_function_name';
*/

-- ============================================================================
-- STEP 3: Create the fixed version
-- ============================================================================

-- Copy the output from STEP 2 here
-- Make these changes:

-- 1. Add SECURITY DEFINER if not present
-- 2. Add this line BEFORE the AS $$ part:
--    SET search_path = public, pg_temp

-- 3. Inside the function body, replace:
--    uid() → auth.uid()
--    table_name → public.table_name
--    
-- Example transformation:

-- BEFORE:
-- CREATE OR REPLACE FUNCTION public.my_function(p_id UUID)
-- RETURNS JSONB
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   SELECT * FROM users WHERE id = uid();
-- END;
-- $$;

-- AFTER:
-- CREATE OR REPLACE FUNCTION public.my_function(p_id UUID)
-- RETURNS JSONB
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public, pg_temp  ← ADDED THIS
-- AS $$
-- BEGIN
--   SELECT * FROM public.users WHERE id = auth.uid();  ← CHANGED THIS
-- END;
-- $$;

-- Paste your fixed function here:
-- (uncomment and edit)
/*
CREATE OR REPLACE FUNCTION public.your_function_name(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Your fixed function body
END;
$$;
*/

-- ============================================================================
-- STEP 4: Test the function
-- ============================================================================

-- Test with valid input:
-- SELECT public.your_function_name(test_value);

-- Test with invalid input:
-- SELECT public.your_function_name(NULL);

-- Test authorization (if applicable):
-- Run as different user and verify it fails/succeeds correctly

-- ============================================================================
-- STEP 5: Verify the fix
-- ============================================================================

-- Check the function now has search_path:
/*
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as search_path_config
FROM pg_proc p
WHERE proname = 'your_function_name'
  AND pronamespace = 'public'::regnamespace;
*/

-- Should show:
-- is_security_definer: true
-- search_path_config: {search_path=public,pg_temp}

-- ============================================================================
-- STEP 6: Repeat for remaining functions
-- ============================================================================

-- Go back to STEP 2 with the next function name from STEP 1

-- ============================================================================
-- COMMON FIXES REFERENCE
-- ============================================================================

-- Issue: Uses uid()
-- Before: WHERE id = uid()
-- After:  WHERE id = auth.uid()

-- Issue: Direct table reference
-- Before: SELECT * FROM users
-- After:  SELECT * FROM public.users

-- Issue: Direct table in UPDATE
-- Before: UPDATE reservations SET ...
-- After:  UPDATE public.reservations SET ...

-- Issue: Direct table in INSERT
-- Before: INSERT INTO points_history ...
-- After:  INSERT INTO public.points_history ...

-- Issue: Uses extension function
-- Before: uuid_generate_v4()
-- After:  extensions.uuid_generate_v4()
-- OR:     Add extensions to search_path

-- Issue: Uses custom type
-- Before: variable mytype;
-- After:  variable public.mytype;

-- ============================================================================
-- BATCH FIX TEMPLATE (for similar functions)
-- ============================================================================

-- If you have multiple similar functions, you can fix them in batch:

/*
-- Function 1
CREATE OR REPLACE FUNCTION public.function1(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ ... $$;

-- Function 2  
CREATE OR REPLACE FUNCTION public.function2(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ ... $$;

-- Function 3
CREATE OR REPLACE FUNCTION public.function3(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$ ... $$;
*/

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Run this to confirm no vulnerable functions remain:
SELECT 
  COUNT(*) as vulnerable_function_count
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

-- Should return: vulnerable_function_count = 0

-- If count > 0, run VERIFY_FUNCTION_SECURITY.sql to see which ones remain

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. Always test functions after fixing them
-- 2. If a function breaks, check these:
--    - Are all tables prefixed with public.?
--    - Changed uid() to auth.uid()?
--    - Are extension functions qualified (extensions.)?
--    - Does the function use any custom schemas?
-- 3. Keep a backup of working functions before modifying
-- 4. Test in staging/local before deploying to production
-- 5. If stuck, see SUPABASE_FUNCTION_SECURITY_GUIDE.md

-- ============================================================================
