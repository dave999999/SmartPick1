-- Reset reservation limits for testing user: davit.batumashvili@gmail.com
-- This will cancel active reservations and reset penalties

-- 1. First, find the user
SELECT id, email, name, penalty_count, penalty_until, status
FROM users
WHERE email = 'davit.batumashvili@gmail.com';

-- 2. Get their active reservations
SELECT id, offer_id, status, created_at, expires_at
FROM reservations
WHERE customer_id = (SELECT id FROM users WHERE email = 'davit.batumashvili@gmail.com')
  AND status = 'ACTIVE'
ORDER BY created_at DESC;

-- 3. Cancel all active reservations for this user
UPDATE reservations
SET status = 'CANCELLED',
    updated_at = NOW()
WHERE customer_id = (SELECT id FROM users WHERE email = 'davit.batumashvili@gmail.com')
  AND status = 'ACTIVE';

-- 4. Reset penalty counter and ban status
UPDATE users
SET penalty_count = 0,
    penalty_until = NULL,
    status = 'ACTIVE',
    updated_at = NOW()
WHERE email = 'davit.batumashvili@gmail.com';

-- 5. Verify the reset
SELECT 
  u.id,
  u.email,
  u.name,
  u.penalty_count,
  u.penalty_until,
  u.status,
  (SELECT COUNT(*) FROM reservations WHERE customer_id = u.id AND status = 'ACTIVE') as active_reservations
FROM users u
WHERE email = 'davit.batumashvili@gmail.com';

-- 6. Show points balance
SELECT user_id, balance
FROM user_points
WHERE user_id = (SELECT id FROM users WHERE email = 'davit.batumashvili@gmail.com');
