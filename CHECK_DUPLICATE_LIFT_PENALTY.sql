-- Find duplicate lift_penalty_with_points functions

SELECT 
  proname as function_name,
  oid,
  pg_get_function_arguments(oid) as parameters,
  pg_get_function_result(oid) as returns,
  proconfig as search_path_setting,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'lift_penalty_with_points'
ORDER BY oid;

-- Expected: Should see 2 rows with different signatures or oid
