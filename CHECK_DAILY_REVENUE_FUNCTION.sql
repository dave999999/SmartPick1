-- Check if get_daily_revenue_summary includes partners
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'get_daily_revenue_summary'
AND routine_schema = 'public';

-- Test the function - see if it returns data
SELECT * FROM get_daily_revenue_summary(30)
ORDER BY date DESC
LIMIT 10;
