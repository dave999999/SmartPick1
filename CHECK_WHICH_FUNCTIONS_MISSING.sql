-- Check which functions are missing search_path or SECURITY DEFINER

SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as search_path_setting,
  CASE 
    WHEN proconfig IS NOT NULL AND proconfig::text LIKE '%search_path%' 
    THEN '✓ search_path configured'
    ELSE '✗ search_path MISSING'
  END as search_path_status,
  CASE 
    WHEN prosecdef = true 
    THEN '✓ SECURITY DEFINER'
    ELSE '✗ NOT SECURITY DEFINER'
  END as security_definer_status
FROM pg_proc 
WHERE proname IN (
  'is_ip_blocked',
  'log_suspicious_activity',
  'invalidate_expired_sessions',
  'invalidate_inactive_sessions',
  'detect_session_anomalies',
  'update_session_activity',
  'cleanup_old_rate_limits',
  'cleanup_old_suspicious_activity',
  'cleanup_expired_ip_blocks',
  'lift_penalty_with_points'
)
ORDER BY proname;
