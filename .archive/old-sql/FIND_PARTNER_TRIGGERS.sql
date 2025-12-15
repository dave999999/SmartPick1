-- Find triggers on partner_point_transactions table
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'partner_point_transactions'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- Get the actual trigger function definitions
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%partner%point%'
ORDER BY p.proname;
