-- =========================================================
-- RESET DAVETEST: Clean Slate + 2000 Points
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  RAISE NOTICE '=== RESETTING DAVETEST USER ===';
  RAISE NOTICE 'User ID: %', v_user_id;
  
  -- Step 1: Delete all penalties
  DELETE FROM user_penalties WHERE user_id = v_user_id;
  RAISE NOTICE '✅ Deleted all penalties';
  
  -- Step 2: Delete all missed pickups
  DELETE FROM user_missed_pickups WHERE user_id = v_user_id;
  RAISE NOTICE '✅ Deleted all missed pickups';
  
  -- Step 3: Clean up old FAILED_PICKUP reservations (optional - mark as CANCELLED)
  UPDATE reservations
  SET status = 'CANCELLED',
      updated_at = NOW()
  WHERE customer_id = v_user_id
    AND status = 'FAILED_PICKUP';
  RAISE NOTICE '✅ Cleaned up old failed pickup reservations';
  
  -- Step 4: Grant 2000 points
  SELECT balance INTO v_current_balance FROM user_points WHERE user_id = v_user_id;
  v_new_balance := v_current_balance + 2000;
  
  UPDATE user_points
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE user_id = v_user_id;
  
  -- Record transaction
  INSERT INTO point_transactions (
    user_id,
    change,
    reason,
    balance_before,
    balance_after,
    metadata
  ) VALUES (
    v_user_id,
    2000,
    'TESTING_RESET',
    v_current_balance,
    v_new_balance,
    jsonb_build_object(
      'granted_at', NOW(),
      'note', 'Reset for penalty system testing'
    )
  );
  
  RAISE NOTICE '✅ Granted 2000 points (% → %)', v_current_balance, v_new_balance;
  RAISE NOTICE '';
  RAISE NOTICE '=== RESET COMPLETE ===';
  RAISE NOTICE 'User is now clean with % points', v_new_balance;
END $$;

-- Verification
SELECT 
  '✅ CLEAN STATE' as status,
  (SELECT COUNT(*) FROM user_penalties WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')) as penalties,
  (SELECT COUNT(*) FROM user_missed_pickups WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')) as missed_pickups,
  (SELECT balance FROM user_points WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')) as points_balance;

-- Show current reservations
SELECT 
  'CURRENT RESERVATIONS' as type,
  status,
  COUNT(*) as count
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
GROUP BY status
ORDER BY count DESC;
