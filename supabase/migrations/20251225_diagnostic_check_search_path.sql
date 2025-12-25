-- ============================================
-- DIAGNOSTIC: Check actual search_path values
-- This will show you what search_path each function has
-- ============================================

SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security,
  COALESCE(
    (SELECT setting 
     FROM unnest(p.proconfig) as setting 
     WHERE setting LIKE 'search_path=%'),
    'NOT SET'
  ) as search_path_setting
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'log_upload_attempt',
    'create_reservation_atomic',
    'create_security_alert',
    'lift_cooldown_with_points',
    'track_reservation_cancellation',
    'update_user_reliability_score',
    'claim_achievement'
  )
ORDER BY p.proname, arguments;
