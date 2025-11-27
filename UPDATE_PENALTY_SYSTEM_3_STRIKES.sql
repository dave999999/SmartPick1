-- UPDATE PENALTY SYSTEM TO 3-STRIKE WARNING SYSTEM
-- User gets 3 warnings (offenses 1-3) with NO suspension
-- Starting from offense 4, they get actual penalties

-- 1. Update the apply_penalty_for_missed_pickup function
CREATE OR REPLACE FUNCTION apply_penalty_for_missed_pickup(
  p_user_id UUID,
  p_reservation_id UUID,
  p_partner_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_offense_count INTEGER;
  v_penalty_type TEXT;
  v_suspension_hours INTEGER;
  v_points_required INTEGER;
  v_penalty_id UUID;
BEGIN
  -- Get current offense count
  SELECT COALESCE(current_penalty_level, 0) + 1 
  INTO v_offense_count
  FROM users 
  WHERE id = p_user_id;

  -- 3-STRIKE SYSTEM: Offenses 1-3 are warnings only, no penalty
  IF v_offense_count <= 3 THEN
    v_penalty_type := 'warning';
    v_suspension_hours := 0;
    v_points_required := 0;
  -- Offense 4+: Start actual penalties
  ELSIF v_offense_count = 4 THEN
    v_penalty_type := 'suspension';
    v_suspension_hours := 1; -- 1 hour
    v_points_required := 100;
  ELSIF v_offense_count = 5 THEN
    v_penalty_type := 'suspension';
    v_suspension_hours := 3; -- 3 hours
    v_points_required := 300;
  ELSIF v_offense_count = 6 THEN
    v_penalty_type := 'suspension';
    v_suspension_hours := 24; -- 1 day
    v_points_required := 500;
  ELSE
    v_penalty_type := 'suspension';
    v_suspension_hours := 168; -- 1 week
    v_points_required := 1000;
  END IF;

  -- Deactivate any existing active penalties
  UPDATE user_penalties 
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;

  -- Create new penalty record
  INSERT INTO user_penalties (
    user_id,
    reservation_id,
    partner_id,
    offense_number,
    offense_type,
    penalty_type,
    suspended_until,
    is_active,
    acknowledged,
    can_lift_with_points,
    points_required
  ) VALUES (
    p_user_id,
    p_reservation_id,
    p_partner_id,
    v_offense_count,
    'missed_pickup',
    v_penalty_type,
    CASE 
      WHEN v_suspension_hours > 0 THEN NOW() + (v_suspension_hours || ' hours')::INTERVAL
      ELSE NULL
    END,
    true,
    false,
    v_points_required > 0,
    v_points_required
  )
  RETURNING id INTO v_penalty_id;

  -- Record in offense history
  INSERT INTO penalty_offense_history (
    penalty_id,
    user_id,
    offense_type,
    offense_date,
    reservation_id,
    partner_id
  ) VALUES (
    v_penalty_id,
    p_user_id,
    'missed_pickup',
    NOW(),
    p_reservation_id,
    p_partner_id
  );

  -- Update user record
  UPDATE users
  SET 
    current_penalty_level = v_offense_count,
    total_missed_pickups = COALESCE(total_missed_pickups, 0) + 1,
    is_suspended = (v_suspension_hours > 0),
    suspended_until = CASE 
      WHEN v_suspension_hours > 0 THEN NOW() + (v_suspension_hours || ' hours')::INTERVAL
      ELSE NULL
    END
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'penalty_id', v_penalty_id,
    'offense_number', v_offense_count,
    'penalty_type', v_penalty_type,
    'suspension_hours', v_suspension_hours,
    'points_required', v_points_required
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update can_user_reserve to only block on actual suspensions (offense 4+)
-- Drop existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS can_user_reserve(UUID);

CREATE OR REPLACE FUNCTION can_user_reserve(p_user_id UUID)
RETURNS TABLE (
  can_reserve BOOLEAN,
  reason TEXT,
  penalty_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      -- Allow reservations if user has warnings (offenses 1-3)
      WHEN up.penalty_type = 'warning' THEN true
      -- Block if suspended (offense 4+) and still within suspension period
      WHEN up.penalty_type = 'suspension' AND up.suspended_until > NOW() THEN false
      -- Allow if no penalty or penalty expired
      ELSE true
    END as can_reserve,
    CASE 
      WHEN up.penalty_type = 'warning' THEN NULL
      WHEN up.penalty_type = 'suspension' AND up.suspended_until > NOW() THEN 
        'Your account is temporarily suspended due to missed pickups'
      ELSE NULL
    END as reason,
    up.id as penalty_id
  FROM users u
  LEFT JOIN user_penalties up ON u.id = up.user_id 
    AND up.is_active = true
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verify the changes
SELECT 'Functions updated successfully!' as status;

-- Show current penalty configuration
SELECT 
  'Penalty Configuration' as info,
  '3 warnings (no suspension)' as offenses_1_to_3,
  '1 hour (100 pts)' as offense_4,
  '3 hours (300 pts)' as offense_5,
  '24 hours (500 pts)' as offense_6,
  '1 week (1000 pts)' as offense_7_plus;
