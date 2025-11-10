-- Quick verification queries to run in Supabase SQL Editor
-- Check that rate limiting is working

-- 1. View recent rate limit attempts
SELECT 
  action,
  identifier,
  COUNT(*) as attempt_count,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM rate_limits
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY action, identifier
ORDER BY last_attempt DESC;

-- 2. Count total rate limit records
SELECT 
  action,
  COUNT(*) as total_records
FROM rate_limits
GROUP BY action
ORDER BY total_records DESC;

-- 3. Check CSRF tokens table (should be empty unless someone logged in)
SELECT 
  COUNT(*) as active_tokens,
  COUNT(DISTINCT user_id) as unique_users
FROM csrf_tokens
WHERE expires_at > NOW();
