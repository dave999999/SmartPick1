-- =========================================================
-- CHECK 6TH OFFENSE FULL DETAILS
-- =========================================================

SELECT 
  id,
  offense_number,
  penalty_type,
  suspended_until,
  is_active,
  acknowledged,
  acknowledged_at,
  admin_reviewed,
  admin_decision,
  reviewed_by,
  reviewed_at,
  can_lift_with_points,
  points_required,
  lifted_with_points,
  created_at
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND offense_number = 6;
