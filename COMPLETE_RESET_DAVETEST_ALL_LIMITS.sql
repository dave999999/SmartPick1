-- =========================================================
-- COMPLETE RESET DAVETEST (All limits + cooldown)
-- =========================================================
-- Resets: rate limits, cooldown lifts, cancellations
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'davetest@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User davetest@gmail.com not found';
    RETURN;
  END IF;
  
  RAISE NOTICE '=== COMPLETE RESET FOR DAVETEST ===';
  RAISE NOTICE '✅ Found davetest: %', v_user_id;

  -- 1. Delete ALL rate limits for davetest
  DELETE FROM rate_limits WHERE identifier = v_user_id::text;
  RAISE NOTICE '✅ Cleared rate limits';

  -- 2. Delete ALL cooldown lifts for davetest
  DELETE FROM user_cooldown_lifts WHERE user_id = v_user_id;
  RAISE NOTICE '✅ Cleared cooldown lifts';

  -- 3. Delete ALL cancellation records for davetest
  DELETE FROM user_cancellation_tracking WHERE user_id = v_user_id;
  RAISE NOTICE '✅ Cleared cancellations';
END $$;

-- Verify complete reset
SELECT 
  u.email,
  COUNT(DISTINCT rl.id) as rate_limit_records,
  COUNT(DISTINCT uct.id) as cancellation_records,
  COUNT(DISTINCT ucl.id) as lift_records,
  '✅ COMPLETE RESET' as status
FROM auth.users u
LEFT JOIN rate_limits rl ON rl.identifier = u.id::text
LEFT JOIN user_cancellation_tracking uct ON uct.user_id = u.id
LEFT JOIN user_cooldown_lifts ucl ON ucl.user_id = u.id
WHERE u.email = 'davetest@gmail.com'
GROUP BY u.email;

-- ✅ RESULT: davetest@gmail.com completely clean
-- - No rate limits (can make reservations)
-- - No cooldown lifts (can lift again if needed)
-- - No cancellations (fresh start)
