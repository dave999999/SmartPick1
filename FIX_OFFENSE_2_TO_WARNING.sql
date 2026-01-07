-- FIX_OFFENSE_2_TO_WARNING.sql
-- Change offense #2 from '1hour' suspension to 'warning'

UPDATE user_penalties
SET 
  penalty_type = 'warning',
  suspended_until = NULL,
  can_lift_with_points = FALSE,
  points_required = 0,
  acknowledged = FALSE,
  updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND offense_number = 2
  AND is_active = TRUE;

-- Verify fix
SELECT
  '✓ OFFENSE #2 NOW WARNING' as status,
  offense_number,
  penalty_type,
  suspended_until,
  can_lift_with_points,
  points_required,
  '→ Should show MissedPickupPopup with 2 hearts filled, 1 empty' as expected_modal
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND offense_number = 2
  AND is_active = TRUE;
