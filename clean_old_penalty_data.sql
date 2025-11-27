-- Clean up old penalty data for batumashvili.davit@gmail.com

-- 1. First check what's in the old penalty columns
SELECT 
  id,
  email,
  penalty_count,
  penalty_until,
  is_banned,
  penalty_warning_shown
FROM users 
WHERE email = 'batumashvili.davit@gmail.com';

-- 2. Clear ALL old penalty columns for this user
UPDATE users
SET 
  penalty_count = 0,
  penalty_until = NULL,
  is_banned = false,
  penalty_warning_shown = false
WHERE email = 'batumashvili.davit@gmail.com';

-- 3. Verify it's cleared
SELECT 
  id,
  email,
  penalty_count,
  penalty_until,
  is_banned,
  penalty_warning_shown
FROM users 
WHERE email = 'batumashvili.davit@gmail.com';

-- 4. Also check if there are any active penalties in NEW system
SELECT 
  id,
  penalty_type,
  offense_number,
  is_active,
  suspended_until
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND is_active = true;
