-- Check if analytics functions exist
SELECT 
  'get_user_growth_stats' as function_name,
  COUNT(*) as exists
FROM pg_proc 
WHERE proname = 'get_user_growth_stats'
UNION ALL
SELECT 
  'get_top_partners' as function_name,
  COUNT(*) as exists
FROM pg_proc 
WHERE proname = 'get_top_partners'
UNION ALL
SELECT 
  'get_category_stats' as function_name,
  COUNT(*) as exists
FROM pg_proc 
WHERE proname = 'get_category_stats';

-- If the above shows 0 for any function, you need to apply the migration:
-- Run: supabase\migrations\20251111_create_analytics_functions.sql in your Supabase SQL Editor
