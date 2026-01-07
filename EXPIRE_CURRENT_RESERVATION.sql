-- =========================================================
-- MANUALLY EXPIRE CURRENT ACTIVE RESERVATION
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_missed_count INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  RAISE NOTICE '=== EXPIRING ACTIVE RESERVATION ===';
  
  -- Get the active reservation
  SELECT id INTO v_reservation_id
  FROM reservations
  WHERE customer_id = v_user_id
    AND status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_reservation_id IS NULL THEN
    RAISE NOTICE '❌ No active reservation found';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found reservation: %', v_reservation_id;
  
  -- Mark as FAILED_PICKUP (expired)
  UPDATE reservations
  SET status = 'FAILED_PICKUP',
      updated_at = NOW()
  WHERE id = v_reservation_id;
  
  RAISE NOTICE '✅ Marked as FAILED_PICKUP';
  
  -- Add to missed pickups tracking
  BEGIN
    INSERT INTO user_missed_pickups (user_id, reservation_id, created_at)
    VALUES (v_user_id, v_reservation_id, NOW());
    RAISE NOTICE '✅ Added to missed pickups';
  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE '⚠️ Already in missed pickups';
  END;
  
  -- Count total missed pickups
  SELECT COUNT(*) INTO v_missed_count
  FROM user_missed_pickups
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '📊 Total missed pickups: %', v_missed_count;
  
END $$;

-- Verify results
SELECT 
  '=== VERIFICATION ===' as section;

-- Show reservation status
SELECT 
  'RESERVATION' as type,
  id,
  status,
  created_at,
  expires_at,
  updated_at
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP'
ORDER BY created_at DESC
LIMIT 1;

-- Show missed pickup count
SELECT 
  'MISSED PICKUPS' as type,
  COUNT(*) as total_count,
  MAX(created_at) as last_missed
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Show current penalties
SELECT 
  'PENALTIES' as type,
  *
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 3;
