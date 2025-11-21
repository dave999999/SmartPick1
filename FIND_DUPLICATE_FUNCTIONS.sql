-- Find and drop duplicate functions without search_path
-- This query will help identify which signatures to drop

-- First, let's see all versions with their full signatures
SELECT 
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.oid,
  CASE 
    WHEN p.proconfig IS NULL THEN '❌ NO search_path'
    WHEN array_to_string(p.proconfig, ', ') LIKE '%search_path%' THEN '✅ HAS search_path'
  END AS status
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
ORDER BY p.proname, status;

-- Now drop the ones WITHOUT search_path by finding their exact signatures
-- We'll need to see the output first to get the right signatures
