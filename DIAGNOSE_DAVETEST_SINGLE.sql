-- =========================================================
-- SINGLE QUERY DIAGNOSTIC FOR DAVETEST
-- =========================================================

-- Get user ID
SELECT 'User ID: ' || id::text as diagnostic
FROM auth.users WHERE email = 'davetest@gmail.com'
UNION ALL
-- Lift records
SELECT 'Lift Records: ' || COUNT(*)::text || 
  CASE WHEN COUNT(*) > 0 THEN 
    ' | Details: ' || STRING_AGG(
      'ID: ' || id::text || 
      ' | Lifted: ' || (lifted_at AT TIME ZONE 'Asia/Tbilisi')::text ||
      ' | Date: ' || (lifted_at AT TIME ZONE 'Asia/Tbilisi')::date::text,
      '; '
    )
  ELSE ''
  END
FROM user_cooldown_lifts 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
UNION ALL
-- Cancellations
SELECT 'Cancellations: ' || COUNT(*)::text ||
  CASE WHEN COUNT(*) > 0 THEN
    ' | Details: ' || STRING_AGG(
      'ID: ' || id::text || 
      ' | Created: ' || (created_at AT TIME ZONE 'Asia/Tbilisi')::text ||
      ' | Date: ' || (created_at AT TIME ZONE 'Asia/Tbilisi')::date::text,
      '; '
    )
  ELSE ''
  END
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
UNION ALL
-- Cooldown status
SELECT 'Currently In Cooldown: ' || is_user_in_cooldown(id)::text
FROM auth.users WHERE email = 'davetest@gmail.com'
UNION ALL
-- Rate limits
SELECT 'Rate Limits: ' || COUNT(*)::text ||
  CASE WHEN COUNT(*) > 0 THEN
    ' | Details: ' || STRING_AGG(
      'Key: ' || rl.key || ' | Action: ' || rl.action,
      '; '
    )
  ELSE ''
  END
FROM rate_limits rl
WHERE rl.identifier = (SELECT id::text FROM auth.users WHERE email = 'davetest@gmail.com');
