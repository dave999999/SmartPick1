-- Check if functions have search_path set correctly
-- Run this to verify the fix was applied

SELECT 
  p.proname AS function_name,
  CASE 
    WHEN p.proconfig IS NULL THEN '❌ NO search_path set'
    WHEN array_to_string(p.proconfig, ', ') LIKE '%search_path%' THEN '✅ search_path is SET'
    ELSE '⚠️ Other config: ' || array_to_string(p.proconfig, ', ')
  END AS status,
  array_to_string(p.proconfig, ', ') AS config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'purchase_reservation_slot',
    'apply_referral_code_with_rewards',
    'calculate_referral_suspicion_score',
    'admin_review_referral',
    'update_system_setting'
  )
ORDER BY p.proname;
