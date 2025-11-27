-- Debug why penalty modal is showing for batumashvili.davit@gmail.com

-- 1. Check user's suspension status in users table
SELECT 
  id,
  email,
  is_suspended,
  suspended_until,
  current_penalty_level,
  total_missed_pickups
FROM users 
WHERE email = 'batumashvili.davit@gmail.com';

-- 2. Check active penalties
SELECT 
  id, 
  user_id, 
  penalty_type, 
  offense_number, 
  is_active, 
  acknowledged,
  suspended_until,
  created_at
FROM user_penalties 
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND is_active = true;

-- 3. Check ALL penalties (including inactive)
SELECT 
  id, 
  penalty_type, 
  offense_number, 
  is_active, 
  acknowledged,
  suspended_until,
  created_at
FROM user_penalties 
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY created_at DESC;

-- 4. Test can_user_reserve function
SELECT * FROM can_user_reserve(
  (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
);

-- 5. Check reservations with FAILED_PICKUP status
SELECT 
  id,
  status,
  created_at,
  expires_at,
  penalty_applied,
  penalty_id
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND status = 'FAILED_PICKUP'
ORDER BY created_at DESC;
