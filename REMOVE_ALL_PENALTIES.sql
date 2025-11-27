-- Find and remove ALL penalties for batumashvili.davit@gmail.com

-- 1. Check for active penalties in NEW system
SELECT 
  id,
  user_id,
  penalty_type,
  offense_number,
  is_active,
  suspended_until,
  created_at
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY created_at DESC;

-- 2. Deactivate ALL penalties for this user
UPDATE user_penalties
SET is_active = false
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com');

-- 3. Clear suspension flags in users table (new system columns)
UPDATE users
SET 
  is_suspended = false,
  suspended_until = NULL,
  current_penalty_level = 0,
  total_missed_pickups = 0
WHERE email = 'batumashvili.davit@gmail.com';

-- 4. Verify everything is cleared
SELECT 
  'Old columns' as source,
  penalty_count,
  penalty_until,
  is_banned
FROM users 
WHERE email = 'batumashvili.davit@gmail.com'
UNION ALL
SELECT 
  'New columns' as source,
  current_penalty_level::integer as penalty_count,
  suspended_until as penalty_until,
  is_suspended as is_banned
FROM users 
WHERE email = 'batumashvili.davit@gmail.com';

-- 5. Check active penalties (should be none)
SELECT 
  COUNT(*) as active_penalties_count
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND is_active = true;

-- 6. Test can_user_reserve function (should return true)
SELECT * FROM can_user_reserve(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);

-- 7. Test get_active_penalty function (should return null/empty)
SELECT * FROM get_active_penalty(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);
