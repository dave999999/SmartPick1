-- =========================================================
-- FIX MISSED PICKUP WARNING LEVELS
-- =========================================================

-- Fix existing warning levels based on creation order
WITH numbered AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as correct_level
  FROM user_missed_pickups
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
)
UPDATE user_missed_pickups ump
SET warning_level = n.correct_level
FROM numbered n
WHERE ump.id = n.id;

-- Verify fix
SELECT 
  id,
  created_at,
  warning_level,
  warning_shown,
  CASE warning_level
    WHEN 1 THEN '💛 You have 3 chances - stay careful!'
    WHEN 2 THEN '🧡 2 chances left - be more careful!'
    WHEN 3 THEN '🔴 1 chance left - this is important!'
    ELSE '🚫 Suspended'
  END as expected_message
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at;

-- Get current warning status
SELECT * FROM get_user_missed_pickup_status(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);
