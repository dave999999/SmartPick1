-- PART 1: Check if cancel and create functions exist

SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%cancel%reservation%' OR routine_name = 'create_reservation_atomic')
ORDER BY routine_name;
