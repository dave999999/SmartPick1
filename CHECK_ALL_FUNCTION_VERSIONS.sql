-- ============================================
-- CHECK ALL create_reservation_atomic FUNCTIONS
-- ============================================
-- There might be multiple versions with different signatures!
-- ============================================

SELECT 
  'ALL VERSIONS:' as info,
  p.oid,
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type,
  CASE 
    WHEN prosrc LIKE '%penalty_type IN (''1hour'', ''24hour'', ''permanent'')%' THEN '✅ CORRECT FIX'
    WHEN prosrc LIKE '%penalty_type%' THEN '⚠️ Has penalty_type check but unclear'
    WHEN prosrc LIKE '%user_penalties%' AND prosrc NOT LIKE '%penalty_type%' THEN '❌ BROKEN - Checks all penalties'
    ELSE '⚠️ Unknown'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_reservation_atomic'
ORDER BY p.oid;
