-- Quick check - just run this (no need to edit)
-- Find your user ID and cancellation count

SELECT 
  u.id,
  u.email,
  COUNT(uct.id) as cancellation_count,
  MAX(uct.cancelled_at) as last_cancellation
FROM auth.users u
LEFT JOIN user_cancellation_tracking uct ON uct.user_id = u.id
GROUP BY u.id, u.email
ORDER BY u.created_at DESC
LIMIT 10;

-- Shows all users and their cancellation counts
-- Find yourself by email
