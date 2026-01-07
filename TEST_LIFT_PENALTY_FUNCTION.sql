-- =========================================================
-- CHECK lift_penalty_with_points FUNCTION
-- =========================================================

-- Check function signature
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) LIKE '%p_penalty_id%' as has_penalty_id_param,
  pg_get_functiondef(p.oid) LIKE '%p_user_id%' as has_user_id_param
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'lift_penalty_with_points';

-- Test the function with davetest's penalty
SELECT lift_penalty_with_points(
  (SELECT id FROM user_penalties WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com') AND is_active = true LIMIT 1),
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
) as result;
