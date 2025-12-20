-- Find the hold_points_on_reservation function
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'hold_points_on_reservation';
