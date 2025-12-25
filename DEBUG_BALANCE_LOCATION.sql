-- Check WHERE the 445 points are actually stored

-- Check user_points table
SELECT 
  'user_points table' as source,
  up.user_id,
  up.balance as points
FROM user_points up
WHERE up.user_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com');

-- If no row exists, create one with 445 points
INSERT INTO user_points (user_id, balance)
VALUES (
  (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com'),
  445
)
ON CONFLICT (user_id) DO UPDATE 
SET balance = 445;

-- Verify it's there now
SELECT 
  'After insert' as status,
  up.balance as points
FROM user_points up
WHERE up.user_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com');

-- Try the lift function again
SELECT * FROM lift_cooldown_with_points(
  (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
);
