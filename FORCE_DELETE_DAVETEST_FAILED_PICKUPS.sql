-- =========================================================
-- FORCE DELETE ALL FAILED_PICKUP RESERVATIONS FOR DAVETEST
-- =========================================================

-- 🚨 THIS WILL COMPLETELY CLEAR DAVETEST'S FAILED PICKUP HISTORY

DO $$
DECLARE
  v_user_id UUID;
  v_failed_count INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  RAISE NOTICE '=== CLEANING DAVETEST FAILED PICKUPS ===';
  
  -- Count failed pickups
  SELECT COUNT(*) INTO v_failed_count
  FROM reservations
  WHERE customer_id = v_user_id AND status = 'FAILED_PICKUP';
  
  RAISE NOTICE 'Found % FAILED_PICKUP reservations', v_failed_count;
  
  -- DELETE 1: Change FAILED_PICKUP to CANCELLED
  UPDATE reservations
  SET status = 'CANCELLED',
      updated_at = NOW()
  WHERE customer_id = v_user_id
    AND status = 'FAILED_PICKUP';
  
  RAISE NOTICE '✅ Changed % FAILED_PICKUP reservations to CANCELLED', v_failed_count;
  
  -- DELETE 2: Remove user_missed_pickups records
  DELETE FROM user_missed_pickups
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✅ Deleted user_missed_pickups records';
  
  -- DELETE 3: Remove user_penalties
  DELETE FROM user_penalties
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✅ Deleted user_penalties records';
  
  -- DELETE 4: Remove penalty_offense_history
  DELETE FROM penalty_offense_history
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✅ Deleted penalty_offense_history records';
  
  -- DELETE 5: Remove cancellation tracking
  DELETE FROM user_cancellation_tracking
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✅ Deleted cancellation tracking records';
  
  -- DELETE 6: Remove cooldown lifts
  DELETE FROM user_cooldown_lifts
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✅ Deleted cooldown lift records';
  
  -- UPDATE: Reset user status
  UPDATE users
  SET 
    is_suspended = false,
    suspended_until = NULL,
    total_missed_pickups = 0,
    current_penalty_level = 0,
    reliability_score = 100,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  RAISE NOTICE '✅ Reset user status';
  RAISE NOTICE '';
  RAISE NOTICE '=== CLEANUP COMPLETE ===';
END $$;

-- VERIFY: Show remaining FAILED_PICKUP count
SELECT 
  '✅ VERIFICATION' as status,
  COUNT(*) as remaining_failed_pickups
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP';

-- VERIFY: Show user status
SELECT 
  '✅ USER STATUS' as status,
  email,
  is_suspended,
  total_missed_pickups,
  reliability_score
FROM users
WHERE id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');
