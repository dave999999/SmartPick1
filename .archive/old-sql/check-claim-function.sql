-- Check if the claim_achievement function was updated correctly
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'claim_achievement'
AND n.nspname = 'public';
