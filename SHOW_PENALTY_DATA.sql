-- =========================================================
-- SHOW ACTUAL PENALTY DATA
-- =========================================================

SELECT 
  id,
  offense_number,
  penalty_type,
  suspended_until,
  is_active,
  can_lift_with_points,
  points_required,
  lifted_with_points,
  created_at
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC;
