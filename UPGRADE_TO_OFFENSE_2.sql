-- UPGRADE_TO_OFFENSE_2.sql
-- Manually upgrade current penalty from offense #1 (warning) to offense #2 (1-hour suspension)

DO $$
DECLARE
  v_user_id UUID;
  v_current_penalty_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  -- Get current active penalty
  SELECT id INTO v_current_penalty_id
  FROM user_penalties
  WHERE user_id = v_user_id
    AND is_active = TRUE
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_current_penalty_id IS NULL THEN
    RAISE EXCEPTION 'No active penalty found. Run MARK_ACTIVE_RESERVATION_EXPIRED.sql first.';
  END IF;
  
  -- Upgrade penalty to offense #2
  UPDATE user_penalties
  SET 
    offense_number = 2,
    penalty_type = '1hour',
    suspended_until = NOW() + INTERVAL '1 hour',
    can_lift_with_points = TRUE,
    points_required = 100,
    acknowledged = FALSE,  -- Force modal to show
    updated_at = NOW()
  WHERE id = v_current_penalty_id;
  
  RAISE NOTICE '✓ Upgraded to offense #2';
  RAISE NOTICE '  penalty_type = 1hour';
  RAISE NOTICE '  suspended_until = % (Tbilisi time)', (NOW() + INTERVAL '1 hour') AT TIME ZONE 'Asia/Tbilisi';
  RAISE NOTICE '  can_lift_with_points = TRUE';
  RAISE NOTICE '  points_required = 100';
END $$;

-- Verify upgrade
SELECT
  '✓ OFFENSE #2 CREATED' as status,
  offense_number,
  penalty_type,
  can_lift_with_points,
  points_required,
  suspended_until AT TIME ZONE 'Asia/Tbilisi' as suspended_until_local,
  acknowledged,
  '→ Should show SuspensionModal with 1-hour countdown and 100pt lift button' as expected_behavior
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND is_active = TRUE
ORDER BY created_at DESC
LIMIT 1;
