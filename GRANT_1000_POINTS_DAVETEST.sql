-- =========================================================
-- GRANT 1000 POINTS TO DAVETEST
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'davetest@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User not found';
    RETURN;
  END IF;
  
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = v_user_id;
  
  v_new_balance := v_current_balance + 1000;
  
  RAISE NOTICE '=== GRANTING 1000 POINTS ===';
  RAISE NOTICE 'User: %', v_user_id;
  RAISE NOTICE 'Current balance: %', v_current_balance;
  RAISE NOTICE 'New balance: %', v_new_balance;
  
  -- Update balance
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
    1000,
    'TESTING_GRANT',
    v_current_balance,
    v_new_balance,
    jsonb_build_object(
      'granted_at', NOW(),
      'note', 'Testing grant for penalty system'
    )
  );
  
  RAISE NOTICE '✅ Points granted successfully!';
END $$;

-- Verify
SELECT 
  'CURRENT BALANCE' as status,
  balance,
  updated_at
FROM user_points
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');
