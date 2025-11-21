-- ============================================
-- FIX: Recreate add_user_points function with correct signature
-- Issue: Function has wrong parameter order in database
-- ============================================

-- Drop existing function (all overloads)
DROP FUNCTION IF EXISTS add_user_points(UUID, INT, TEXT, JSONB);
DROP FUNCTION IF EXISTS add_user_points(JSONB, INT, TEXT, UUID);
DROP FUNCTION IF EXISTS add_user_points;

-- Recreate with CORRECT signature
CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF v_current_balance IS NULL THEN
    -- Create if doesn't exist
    INSERT INTO user_points (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = user_points.balance + p_amount
    RETURNING balance INTO v_new_balance;

    v_current_balance := 0;
  ELSE
    -- Calculate and update
    v_new_balance := v_current_balance + p_amount;

    UPDATE user_points
    SET balance = v_new_balance
    WHERE user_id = p_user_id;
  END IF;

  -- Log transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (p_user_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_user_points TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_points TO anon;

-- Add comment
COMMENT ON FUNCTION add_user_points IS
  'Adds points to user account. Parameters: p_user_id, p_amount, p_reason, p_metadata. Returns: {success, balance, transaction_id}';

-- Test the function (optional - comment out if you want)
-- SELECT add_user_points(
--   (SELECT id FROM users LIMIT 1),
--   10,
--   'test',
--   '{"test": true}'::jsonb
-- );
