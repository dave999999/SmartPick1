-- Test the get_buyer_purchase_details function directly
SELECT * FROM get_buyer_purchase_details(NULL);

-- Check if function exists
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as result_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_buyer_purchase_details'
  AND n.nspname = 'public';
