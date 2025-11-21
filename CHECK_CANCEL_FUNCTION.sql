-- Check if user_cancel_reservation_split function exists and its permissions
SELECT 
  routine_name,
  routine_type,
  security_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'user_cancel_reservation_split';

-- Check function definition
SELECT 
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'user_cancel_reservation_split';

-- Check if add_partner_points function exists (needed by cancel function)
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'add_partner_points';

-- Test permissions by calling the function with a fake UUID (should fail gracefully)
-- This will tell us if the function is callable at all
SELECT 
  'Function is callable' as test,
  user_cancel_reservation_split('00000000-0000-0000-0000-000000000000') as result;
