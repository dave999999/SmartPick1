-- =========================================================
-- CHECK IF PENALTY IS ACKNOWLEDGED
-- =========================================================

SELECT 
  id,
  offense_number,
  penalty_type,
  suspended_until,
  is_active,
  acknowledged,
  acknowledged_at,
  can_lift_with_points,
  points_required
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND offense_number = 6;
