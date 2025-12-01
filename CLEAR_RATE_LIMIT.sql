-- Clear all rate limit penalties for testing
-- Run this in Supabase SQL Editor

-- 1. Clear all active penalties
UPDATE user_penalties
SET 
  is_active = false,
  lifted_at = NOW()
WHERE is_active = true;

-- 2. Reset rate limit tracking (optional - only if you have this table)
-- DELETE FROM rate_limit_tracking WHERE created_at > NOW() - INTERVAL '1 hour';

-- 3. Verify no active penalties remain
SELECT * FROM user_penalties WHERE is_active = true;

-- Should return 0 rows
