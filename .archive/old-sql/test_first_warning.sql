-- TEST SCENARIO 1: First Warning
-- Manually create a first offense penalty for batumashvili.davit@gmail.com

-- Get user and reservation IDs
DO $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_partner_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'batumashvili.davit@gmail.com';
  
  -- Get an active reservation for this user (or use any reservation)
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
  
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Reservation ID: %', v_reservation_id;
  RAISE NOTICE 'Partner ID: %', v_partner_id;
  
  -- Create first offense penalty (WARNING)
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
    1, -- First offense
    'missed_pickup',
    'warning', -- No suspension
    NULL, -- No suspension time
    true, -- Active
    false, -- Not acknowledged yet
    false, -- Cannot lift warning with points
    0, -- No points required
    NOW()
  );
  
  -- Update users table (just offense count, no suspension)
  UPDATE users
  SET 
    current_penalty_level = 1,
    total_missed_pickups = 1
  WHERE id = v_user_id;
  
  RAISE NOTICE '✅ First warning created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Now refresh the app and you should see the WARNING modal';
  RAISE NOTICE 'Expected: Yellow warning screen with "I Understand" button';
END $$;

-- Verify the penalty was created
SELECT 
  'Created Penalty' as status,
  offense_number,
  penalty_type,
  is_active,
  acknowledged,
  created_at
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND is_active = true;

-- Test get_active_penalty
SELECT 
  'Active Penalty Check' as test,
  penalty_id,
  offense_number,
  penalty_type,
  suspended_until
FROM get_active_penalty((SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'));

-- Test can_user_reserve (should still allow reservations for warning)
SELECT 
  'Can Reserve Check' as test,
  can_reserve,
  reason,
  penalty_id
FROM can_user_reserve((SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'));
