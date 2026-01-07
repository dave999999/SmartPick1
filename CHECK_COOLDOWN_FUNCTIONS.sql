-- Check what cooldown-related functions exist
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%cooldown%' 
    OR routine_name LIKE '%cancel%'
    OR routine_name LIKE '%reservation%')
ORDER BY routine_name;

-- Check what columns exist in reservations table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reservations'
ORDER BY ordinal_position;
