-- TEST 3-STRIKE WARNING SYSTEM
-- Creates test scenarios for the new 3-warning system

-- HELPER: Get user info
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'batumashvili.davit@gmail.com';
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = v_email;
  RAISE NOTICE 'Testing for user: % (ID: %)', v_email, v_user_id;
END $$;

-- ===========================================
-- TEST 1: First Warning (Strike 1 of 3)
-- ===========================================
CREATE OR REPLACE FUNCTION test_strike_1() RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_partner_id UUID;
BEGIN
  -- Reset user to clean state first
  SELECT id INTO v_user_id FROM users WHERE email = 'batumashvili.davit@gmail.com';
  
  UPDATE user_penalties SET is_active = false WHERE user_id = v_user_id;
  UPDATE users SET 
    current_penalty_level = 0,
    total_missed_pickups = 0,
    is_suspended = false,
    suspended_until = NULL
  WHERE id = v_user_id;

  -- Get reservation and partner
  SELECT id, partner_id INTO v_reservation_id, v_partner_id
  FROM reservations
  WHERE customer_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_reservation_id IS NULL THEN
    v_reservation_id := gen_random_uuid();
    v_partner_id := (SELECT id FROM partners LIMIT 1);
  END IF;

  -- Create first warning
  INSERT INTO user_penalties (
    user_id, reservation_id, partner_id,
    offense_number, offense_type, penalty_type,
    suspended_until, is_active, acknowledged,
    can_lift_with_points, points_required
  ) VALUES (
    v_user_id, v_reservation_id, v_partner_id,
    1, 'missed_pickup', 'warning',
    NULL, true, false, false, 0
  );

  UPDATE users SET current_penalty_level = 1, total_missed_pickups = 1
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Strike 1/3 created - Warning only, no suspension';
  RAISE NOTICE 'User can still reserve. Shows: "3 chances left — you''re good! 💚"';
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TEST 2: Second Warning (Strike 2 of 3)
-- ===========================================
CREATE OR REPLACE FUNCTION test_strike_2() RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_partner_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'batumashvili.davit@gmail.com';
  
  -- Deactivate previous penalty
  UPDATE user_penalties SET is_active = false WHERE user_id = v_user_id;

  SELECT id, partner_id INTO v_reservation_id, v_partner_id
  FROM reservations
  WHERE customer_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_reservation_id IS NULL THEN
    v_reservation_id := gen_random_uuid();
    v_partner_id := (SELECT id FROM partners LIMIT 1);
  END IF;

  INSERT INTO user_penalties (
    user_id, reservation_id, partner_id,
    offense_number, offense_type, penalty_type,
    suspended_until, is_active, acknowledged,
    can_lift_with_points, points_required
  ) VALUES (
    v_user_id, v_reservation_id, v_partner_id,
    2, 'missed_pickup', 'warning',
    NULL, true, false, false, 0
  );

  UPDATE users SET current_penalty_level = 2, total_missed_pickups = 2
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Strike 2/3 created - Warning only, no suspension';
  RAISE NOTICE 'User can still reserve. Shows: "2 chances left — stay careful! 💛"';
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TEST 3: Third Warning (Strike 3 of 3 - LAST CHANCE)
-- ===========================================
CREATE OR REPLACE FUNCTION test_strike_3() RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_partner_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'batumashvili.davit@gmail.com';
  
  UPDATE user_penalties SET is_active = false WHERE user_id = v_user_id;

  SELECT id, partner_id INTO v_reservation_id, v_partner_id
  FROM reservations
  WHERE customer_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_reservation_id IS NULL THEN
    v_reservation_id := gen_random_uuid();
    v_partner_id := (SELECT id FROM partners LIMIT 1);
  END IF;

  INSERT INTO user_penalties (
    user_id, reservation_id, partner_id,
    offense_number, offense_type, penalty_type,
    suspended_until, is_active, acknowledged,
    can_lift_with_points, points_required
  ) VALUES (
    v_user_id, v_reservation_id, v_partner_id,
    3, 'missed_pickup', 'warning',
    NULL, true, false, false, 0
  );

  UPDATE users SET current_penalty_level = 3, total_missed_pickups = 3
  WHERE id = v_user_id;

  RAISE NOTICE '✅ Strike 3/3 created - LAST WARNING';
  RAISE NOTICE 'User can still reserve. Shows: "1 chance left — this is important! 🧡"';
  RAISE NOTICE '⚠️  NEXT MISS = 1-hour suspension!';
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TEST 4: Fourth Offense (ACTUAL PENALTY - 1 hour suspension)
-- ===========================================
CREATE OR REPLACE FUNCTION test_offense_4() RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_partner_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'batumashvili.davit@gmail.com';
  
  UPDATE user_penalties SET is_active = false WHERE user_id = v_user_id;

  SELECT id, partner_id INTO v_reservation_id, v_partner_id
  FROM reservations
  WHERE customer_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_reservation_id IS NULL THEN
    v_reservation_id := gen_random_uuid();
    v_partner_id := (SELECT id FROM partners LIMIT 1);
  END IF;

  INSERT INTO user_penalties (
    user_id, reservation_id, partner_id,
    offense_number, offense_type, penalty_type,
    suspended_until, is_active, acknowledged,
    can_lift_with_points, points_required
  ) VALUES (
    v_user_id, v_reservation_id, v_partner_id,
    4, 'missed_pickup', 'suspension',
    NOW() + INTERVAL '1 hour', true, false, true, 100
  );

  UPDATE users SET 
    current_penalty_level = 4,
    total_missed_pickups = 4,
    is_suspended = true,
    suspended_until = NOW() + INTERVAL '1 hour'
  WHERE id = v_user_id;

  RAISE NOTICE '🚫 Offense 4 - FIRST ACTUAL PENALTY!';
  RAISE NOTICE '1-hour suspension (100 points to lift)';
  RAISE NOTICE 'User CANNOT reserve until suspension expires or lifted';
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- RUN TESTS (comment out what you don't need)
-- ===========================================

-- Run Strike 1
SELECT test_strike_1();

-- -- Run Strike 2 (uncomment to test)
-- SELECT test_strike_2();

-- -- Run Strike 3 (uncomment to test)
-- SELECT test_strike_3();

-- -- Run Offense 4 (uncomment to test)
-- SELECT test_offense_4();

-- Verify results
SELECT 
  offense_number,
  penalty_type,
  suspended_until,
  is_active,
  acknowledged,
  points_required,
  created_at
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY created_at DESC
LIMIT 1;

SELECT 
  current_penalty_level,
  total_missed_pickups,
  is_suspended,
  suspended_until
FROM users
WHERE email = 'batumashvili.davit@gmail.com';
