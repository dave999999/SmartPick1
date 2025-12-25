-- Check the ACTUAL user balance and what's blocking the lift

-- 1. Check user's actual points balance
SELECT 
  u.email,
  COALESCE(up.balance, 0) as actual_balance,
  CASE 
    WHEN COALESCE(up.balance, 0) >= 100 THEN '✅ Has enough (100+)'
    ELSE '❌ Not enough (< 100)'
  END as can_afford
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
WHERE u.email = 'davitbatumashvili@gmail.com';

-- 2. Check today's cancellation count (Georgia time)
SELECT COUNT(*) as todays_cancels_georgia
FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 3. Check if they're actually in cooldown
SELECT * FROM is_user_in_cooldown(
  (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
);

-- 4. Try to lift (will show exact error if any)
SELECT * FROM lift_cooldown_with_points(
  (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
);
