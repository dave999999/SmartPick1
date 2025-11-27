-- TEST SCENARIO 2: Second Offense (1-hour suspension)
-- Create a second missed pickup penalty for batumashvili.davit@gmail.com

-- First, deactivate the first warning
UPDATE user_penalties
SET is_active = false, acknowledged = true
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND offense_number = 1;

-- Create second offense penalty (1 HOUR SUSPENSION with option to lift with 100 points)
DO $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_partner_id UUID;
  v_suspended_until TIMESTAMPTZ;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'batumashvili.davit@gmail.com';
  
  -- Get a reservation for this user
  SELECT id, partner_id INTO v_reservation_id, v_partner_id
  FROM reservations
  WHERE customer_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no reservation found, use placeholder
  IF v_reservation_id IS NULL THEN
    v_reservation_id := gen_random_uuid();
    v_partner_id := (SELECT id FROM partners LIMIT 1);
  END IF;
  
  -- Calculate 1 hour from now
  v_suspended_until := NOW() + INTERVAL '1 hour';
  
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Reservation ID: %', v_reservation_id;
  RAISE NOTICE 'Partner ID: %', v_partner_id;
  RAISE NOTICE 'Suspended Until: %', v_suspended_until;
  
  -- Create second offense penalty (1 HOUR SUSPENSION)
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
    points_required,
    created_at
  ) VALUES (
    v_user_id,
    v_reservation_id,
    v_partner_id,
    2, -- Second offense
    'missed_pickup',
    '1hour', -- 1 hour suspension
    v_suspended_until,
    true, -- Active
    false, -- Not acknowledged yet
    true, -- CAN lift with points
    100, -- Requires 100 SmartPoints
    NOW()
  );
  
  -- Update users table
  UPDATE users
  SET 
    current_penalty_level = 2,
    total_missed_pickups = 2,
    is_suspended = true,
    suspended_until = v_suspended_until
  WHERE id = v_user_id;
  
  RAISE NOTICE '✅ Second offense (1-hour suspension) created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 What to expect:';
  RAISE NOTICE '   - User CANNOT make new reservations during suspension';
  RAISE NOTICE '   - Modal shows countdown timer (1 hour)';
  RAISE NOTICE '   - User can lift ban with 100 SmartPoints';
  RAISE NOTICE '   - User can request forgiveness from partner';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Now refresh the app and try to click any Reserve button';
END $$;

-- Verify the penalty was created
SELECT 
  'Created Penalty' as status,
  offense_number,
  penalty_type,
  suspended_until,
  can_lift_with_points,
  points_required,
  is_active,
  acknowledged
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND offense_number = 2;

-- Check user status
SELECT 
  'User Status' as check_type,
  email,
  current_penalty_level,
  total_missed_pickups,
  is_suspended,
  suspended_until
FROM users
WHERE email = 'batumashvili.davit@gmail.com';

-- Test can_user_reserve (should return FALSE)
SELECT 
  'Can Reserve Check' as test,
  can_reserve,
  reason,
  suspended_until,
  penalty_id
FROM can_user_reserve((SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'));
