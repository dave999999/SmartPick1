-- =========================================================
-- FIX USER SUSPENSION FLAGS
-- =========================================================

-- Update the users table to match the penalty
UPDATE users
SET 
  is_suspended = TRUE,
  suspended_until = (
    SELECT suspended_until 
    FROM user_penalties 
    WHERE user_id = users.id 
      AND is_active = TRUE 
      AND acknowledged = FALSE
    ORDER BY created_at DESC 
    LIMIT 1
  )
WHERE id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Verify the fix
SELECT 
  '=== USER SUSPENSION STATUS ===' as section;

SELECT 
  u.email,
  u.is_suspended,
  u.suspended_until,
  p.offense_number,
  p.penalty_type,
  p.is_active,
  p.acknowledged
FROM users u
LEFT JOIN user_penalties p ON p.user_id = u.id AND p.is_active = TRUE
WHERE u.id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Test get_active_penalty again
SELECT 
  '=== TEST get_active_penalty AGAIN ===' as section;

SELECT * FROM get_active_penalty(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);
