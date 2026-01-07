-- Manually create a missed pickup penalty for testing
-- This simulates what happens when a partner confirms a user didn't pick up their reservation

-- Variables (change these as needed)
DO $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_partner_id UUID;
  v_offense_number INTEGER;
  v_penalty_type TEXT;
  v_suspended_until TIMESTAMPTZ;
BEGIN
  -- Get user ID for davetest@gmail.com
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get the most recent reservation for this user
  SELECT r.id, r.partner_id 
  INTO v_reservation_id, v_partner_id
  FROM reservations r
  WHERE r.customer_id = v_user_id
  ORDER BY r.created_at DESC
  LIMIT 1;

  IF v_reservation_id IS NULL THEN
    RAISE EXCEPTION 'No reservations found for user';
  END IF;

  -- Calculate offense number (how many penalties user has had)
  SELECT COALESCE(MAX(offense_number), 0) + 1
  INTO v_offense_number
  FROM user_penalties
  WHERE user_id = v_user_id;

  -- Determine penalty type based on offense number
  -- 1st offense = warning
  -- 2nd offense = 1hour suspension
  -- 3rd offense = 24hour suspension  
  -- 4th offense = permanent ban
  CASE v_offense_number
    WHEN 1 THEN
      v_penalty_type := 'warning';
      v_suspended_until := NULL;
    WHEN 2 THEN
      v_penalty_type := '1hour';
      v_suspended_until := NOW() + INTERVAL '1 hour';
    WHEN 3 THEN
      v_penalty_type := '24hour';
      v_suspended_until := NOW() + INTERVAL '24 hours';
    ELSE
      v_penalty_type := 'permanent';
      v_suspended_until := NOW() + INTERVAL '100 years'; -- Effectively permanent
  END CASE;

  -- Mark the reservation as expired with no_show
  UPDATE reservations
  SET 
    status = 'EXPIRED',
    no_show = TRUE,
    expires_at = NOW() - INTERVAL '1 hour',
    updated_at = NOW()
  WHERE id = v_reservation_id;

  -- Create the penalty record
  INSERT INTO user_penalties (
    user_id,
    reservation_id,
    partner_id,
    offense_number,
    offense_type,
    penalty_type,
    suspended_until,
    is_active,
    acknowledged
  ) VALUES (
    v_user_id,
    v_reservation_id,
    v_partner_id,
    v_offense_number,
    'missed_pickup',
    v_penalty_type,
    v_suspended_until,
    TRUE,
    FALSE
  );

  -- Update user's suspension status
  UPDATE users
  SET 
    total_missed_pickups = COALESCE(total_missed_pickups, 0) + 1,
    current_penalty_level = v_offense_number,
    is_suspended = (v_penalty_type != 'warning'),
    suspended_until = v_suspended_until,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Mark the reservation as having a penalty applied
  UPDATE reservations
  SET penalty_applied = TRUE
  WHERE id = v_reservation_id;

  -- Output the result
  RAISE NOTICE '✓ Penalty created successfully!';
  RAISE NOTICE '  User: davetest@gmail.com';
  RAISE NOTICE '  Offense #%', v_offense_number;
  RAISE NOTICE '  Penalty: %', v_penalty_type;
  RAISE NOTICE '  Suspended until: %', v_suspended_until;
END $$;

-- Verify the penalty was created
SELECT 
  'Penalty created ✓' as status,
  p.offense_number,
  p.offense_type,
  p.penalty_type,
  p.suspended_until,
  p.is_active,
  p.acknowledged,
  u.email
FROM user_penalties p
JOIN users u ON u.id = p.user_id
WHERE u.email = 'davetest@gmail.com'
ORDER BY p.created_at DESC
LIMIT 1;

-- Check user's suspension status
SELECT 
  'User status' as check_type,
  u.email,
  u.total_missed_pickups,
  u.current_penalty_level,
  u.is_suspended,
  u.suspended_until,
  u.reliability_score
FROM users u
WHERE u.email = 'davetest@gmail.com';
