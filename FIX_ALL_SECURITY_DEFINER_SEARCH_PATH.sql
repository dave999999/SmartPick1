-- ============================================
-- FIX ALL SECURITY DEFINER FUNCTIONS
-- Add SET search_path = public to all SECURITY DEFINER functions
-- This resolves the "Function Search Path Mutable" security warning
-- ============================================

-- Why this is needed:
-- When a function is SECURITY DEFINER, it runs with the privileges of the creator.
-- Without an explicit search_path, an attacker could manipulate the search path
-- to inject malicious tables/functions that could be executed with elevated privileges.
-- 
-- Solution: Add "SET search_path = public" to lock down the schema search path.

-- ============================================
-- Query to find all vulnerable functions
-- ============================================

SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE prosecdefiner = true
  AND n.nspname = 'public'
  AND NOT EXISTS (
    SELECT 1 
    FROM pg_proc_config pc 
    WHERE pc.oid = p.oid 
    AND pc.config @> ARRAY['search_path=public']
  )
ORDER BY p.proname;

-- This will list all SECURITY DEFINER functions without proper search_path
-- Run the results and manually add "SET search_path = public" after SECURITY DEFINER
