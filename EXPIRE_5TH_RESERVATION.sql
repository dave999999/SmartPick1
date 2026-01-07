-- =========================================================
-- EXPIRE 5TH RESERVATION FOR DAVETEST
-- =========================================================

-- Step 1: Check current active reservation
SELECT 
  'CURRENT ACTIVE' as step,
  r.id,
  r.status,
  r.expires_at,
  (NOW() - r.expires_at) as time_ago
FROM reservations r
WHERE r.customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND r.status = 'ACTIVE'
ORDER BY r.created_at DESC
LIMIT 1;

-- Step 2: Force expire it (mark as FAILED_PICKUP)
UPDATE reservations
SET status = 'FAILED_PICKUP',
    updated_at = NOW()
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';

-- Step 3: Track as missed pickup
DO $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  -- Get the just-expired reservation
  SELECT r.id INTO v_reservation_id
  FROM reservations r
  WHERE r.customer_id = v_user_id
    AND r.status = 'FAILED_PICKUP'
  ORDER BY r.updated_at DESC
  LIMIT 1;
  
  -- Track it
  BEGIN
    INSERT INTO user_missed_pickups (
      user_id,
      reservation_id,
      created_at
    ) VALUES (
      v_user_id,
      v_reservation_id,
      NOW()
    );
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
  
  RAISE NOTICE '✅ Expired reservation % for user %', v_reservation_id, v_user_id;
END $$;

-- Step 4: Verify total missed pickups
SELECT 
  'TOTAL MISSED' as status,
  COUNT(*) as total_count
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Step 5: This should trigger 5th offense penalty
-- Refresh the app - you should see suspension modal with:
-- - 24 hour suspension
-- - 500 points to lift
SELECT 
  'EXPECTED' as info,
  '5th offense = 24 hour suspension, 500 points to lift' as message;
