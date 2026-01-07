-- Check if get_active_penalty function exists

SELECT 'get_active_penalty function' as check_type;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_active_penalty';

-- If it doesn't exist, show what penalty functions DO exist
SELECT 'All penalty functions' as check_type;
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%penalty%'
ORDER BY routine_name;
