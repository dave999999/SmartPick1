-- ============================================
-- FIX add_user_points FUNCTION
-- Run this to ensure add_user_points exists
-- ============================================

CREATE OR REPLACE FUNCTION public.add_user_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
  v_caller_role TEXT;
BEGIN
  -- SECURITY: Only service_role can modify points
  SELECT current_setting('request.jwt.claims', true)::json->>'role' INTO v_caller_role;

  IF v_caller_role != 'service_role' THEN
    RAISE EXCEPTION 'Permission denied: only backend can modify points';
  END IF;

  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Create or update
  IF v_current_balance IS NULL THEN
    INSERT INTO user_points (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = user_points.balance + p_amount
    RETURNING balance INTO v_new_balance;
    v_current_balance := 0;
  ELSE
    v_new_balance := v_current_balance + p_amount;
    UPDATE user_points SET balance = v_new_balance WHERE user_id = p_user_id;
  END IF;

  -- Log transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (p_user_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'user_id', p_user_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'change', p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_user_points(UUID, INT, TEXT, JSONB) TO service_role;

-- Verification
SELECT 'add_user_points function: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'add_user_points') 
  THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status;

SELECT '✅ Function fixed! Now test pickup again.' AS result;
