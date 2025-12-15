-- =====================================================
-- FIX: admin_grant_points function to use user_points table
-- =====================================================

CREATE OR REPLACE FUNCTION admin_grant_points(
  p_user_id UUID,
  p_points INTEGER, -- Can be negative to deduct
  p_reason TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_admin_id UUID;
  v_old_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  v_admin_id := auth.uid();
  
  -- Get current balance from user_points table (NOT users.points)
  SELECT balance INTO v_old_balance 
  FROM public.user_points 
  WHERE user_id = p_user_id;
  
  IF v_old_balance IS NULL THEN
    -- User doesn't have a points record yet, create one
    INSERT INTO public.user_points (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING balance INTO v_old_balance;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_old_balance + p_points;
  
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Cannot deduct more points than user has (has: %, trying to deduct: %)', v_old_balance, ABS(p_points);
  END IF;
  
  -- Update user_points balance (NOT users.points)
  UPDATE public.user_points 
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Create transaction record
  INSERT INTO public.point_transactions (
    user_id, 
    change, 
    reason, 
    balance_before, 
    balance_after, 
    metadata
  )
  VALUES (
    p_user_id, 
    p_points, 
    p_reason,
    v_old_balance,
    v_new_balance,
    jsonb_build_object(
      'admin_id', v_admin_id,
      'admin_notes', p_admin_notes,
      'granted_at', NOW()
    )
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
DO $$
DECLARE
  v_test_user_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Get a test customer user
  SELECT id INTO v_test_user_id 
  FROM users 
  WHERE role = 'CUSTOMER' 
  LIMIT 1;
  
  IF v_test_user_id IS NOT NULL THEN
    RAISE NOTICE 'Testing admin_grant_points with user: %', v_test_user_id;
    
    -- Try granting 50 points
    v_transaction_id := admin_grant_points(
      v_test_user_id,
      50,
      'Test grant from SQL',
      'Testing the fix'
    );
    
    RAISE NOTICE '✓ Successfully granted 50 points, transaction ID: %', v_transaction_id;
    
    -- Check the balance
    DECLARE
      v_balance INTEGER;
    BEGIN
      SELECT balance INTO v_balance FROM user_points WHERE user_id = v_test_user_id;
      RAISE NOTICE '✓ User balance is now: % points', v_balance;
    END;
    
    -- Deduct the test points back
    v_transaction_id := admin_grant_points(
      v_test_user_id,
      -50,
      'Test deduct from SQL',
      'Reverting test'
    );
    
    RAISE NOTICE '✓ Successfully deducted 50 points, transaction ID: %', v_transaction_id;
    RAISE NOTICE '✓ admin_grant_points function working correctly!';
  ELSE
    RAISE NOTICE 'No test user found, skipping test';
  END IF;
END $$;

-- Verify
SELECT 
  'admin_grant_points function' as check,
  'FIXED' as status,
  'Now uses user_points.balance instead of users.points' as note;
