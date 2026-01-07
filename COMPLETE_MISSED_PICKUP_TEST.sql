-- COMPLETE TEST: Create reservation and simulate missed pickup for davetest@gmail.com
-- This will trigger the warning modal

-- ========================================
-- STEP 1: CLEAN SLATE - Reset all penalties
-- ========================================
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  -- Delete existing penalties
  DELETE FROM user_penalties WHERE user_id = v_user_id;
  
  -- Delete offense history
  DELETE FROM penalty_offense_history WHERE user_id = v_user_id;
  
  -- Reset user's penalty status
  UPDATE users
  SET 
    total_missed_pickups = 0,
    current_penalty_level = 0,
    is_suspended = FALSE,
    suspended_until = NULL,
    reliability_score = 100,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  RAISE NOTICE '✓ User reset complete';
END $$;

-- ========================================
-- STEP 2: CREATE NEW RESERVATION
-- ========================================
DO $$
DECLARE
  v_user_id UUID;
  v_offer_id UUID;
  v_partner_id UUID;
  v_reservation_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  -- Get any active offer
  SELECT o.id, o.partner_id 
  INTO v_offer_id, v_partner_id
  FROM offers o
  WHERE o.status = 'ACTIVE'
  LIMIT 1;
  
  IF v_offer_id IS NULL THEN
    RAISE EXCEPTION 'No active offers found';
  END IF;
  
  -- Create a reservation
  INSERT INTO reservations (
    customer_id,
    user_id,
    offer_id,
    partner_id,
    quantity,
    total_price,
    status,
    qr_code,
    expires_at
  ) VALUES (
    v_user_id,
    v_user_id,
    v_offer_id,
    v_partner_id,
    1,
    0,
    'ACTIVE',
    'TEST-' || gen_random_uuid()::text,
    NOW() + INTERVAL '2 hours'
  )
  RETURNING id INTO v_reservation_id;
  
  RAISE NOTICE '✓ Reservation created: %', v_reservation_id;
END $$;

-- ========================================
-- STEP 3: MARK AS MISSED PICKUP (SIMULATE EXPIRATION)
-- ========================================
DO $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_partner_id UUID;
  v_offense_number INTEGER;
  v_penalty_type TEXT;
  v_suspended_until TIMESTAMPTZ;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  -- Get the most recent reservation
  SELECT r.id, r.partner_id 
  INTO v_reservation_id, v_partner_id
  FROM reservations r
  WHERE r.customer_id = v_user_id
  ORDER BY r.created_at DESC
  LIMIT 1;
  
  -- Mark reservation as expired with no-show
  UPDATE reservations
  SET 
    status = 'EXPIRED',
    no_show = TRUE,
    expires_at = NOW() - INTERVAL '1 hour',
    updated_at = NOW()
  WHERE id = v_reservation_id;
  
  -- Calculate offense number
  SELECT COALESCE(MAX(offense_number), 0) + 1
  INTO v_offense_number
  FROM user_penalties
  WHERE user_id = v_user_id;
  
  -- 1st offense = warning (no suspension)
  v_penalty_type := 'warning';
  v_suspended_until := NULL;
  
  -- Create penalty
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
    FALSE  -- NOT acknowledged - this will trigger the modal
  );
  
  -- Update user status
  UPDATE users
  SET 
    total_missed_pickups = COALESCE(total_missed_pickups, 0) + 1,
    current_penalty_level = v_offense_number,
    is_suspended = FALSE,  -- Warning doesn't suspend
    suspended_until = NULL,
    reliability_score = 80,  -- Reduced from 100
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Mark reservation
  UPDATE reservations
  SET penalty_applied = TRUE
  WHERE id = v_reservation_id;
  
  RAISE NOTICE '✓ Missed pickup penalty created!';
  RAISE NOTICE '  Offense: %', v_offense_number;
  RAISE NOTICE '  Type: %', v_penalty_type;
END $$;

-- ========================================
-- STEP 4: VERIFY EVERYTHING
-- ========================================

-- Check penalty was created
SELECT 
  '✓ PENALTY CREATED' as status,
  p.id as penalty_id,
  p.offense_number,
  p.penalty_type,
  p.acknowledged,
  p.is_active
FROM user_penalties p
WHERE p.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY p.created_at DESC
LIMIT 1;

-- Check user status
SELECT 
  '✓ USER STATUS' as status,
  u.email,
  u.total_missed_pickups,
  u.current_penalty_level,
  u.is_suspended,
  u.reliability_score
FROM users u
WHERE u.email = 'davetest@gmail.com';

-- Check get_active_penalty returns it
SELECT 
  '✓ ACTIVE PENALTY (what frontend sees)' as status,
  *
FROM get_active_penalty(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- ========================================
-- ✅ NOW HARD REFRESH BROWSER (Ctrl+Shift+R)
-- The warning modal should appear immediately!
-- ========================================
