-- Check if penalty system functions exist
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('can_user_reserve', 'get_active_penalty', 'calculate_reliability_score')
ORDER BY routine_name;

-- If they don't exist, you need to run the migration file in Supabase SQL Editor
-- File: supabase/migrations/20251127_penalty_system_complete.sql
