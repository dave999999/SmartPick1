-- CHECK_LIFT_PENALTY_FUNCTION.sql
-- Check if lift_penalty_with_points function exists with correct signature

-- Check all versions of this function
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'lift_penalty_with_points';
