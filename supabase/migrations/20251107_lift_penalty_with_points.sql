-- Secure function to lift penalty with SmartPoints atomically
-- Derives user id via auth.uid(); no client parameters.
-- Costs: 30 points for 1st penalty (30min), 90 points for 2nd (90min)
-- 3rd (24hr) cannot be lifted, permanent ban cannot be lifted.

CREATE OR REPLACE FUNCTION lift_penalty_with_points()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_penalty_count INT;
  v_penalty_until TIMESTAMPTZ;
  v_is_banned BOOLEAN;
  v_cost INT;
  v_balance INT;
  v_new_balance INT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT penalty_count, penalty_until, is_banned
    INTO v_penalty_count, v_penalty_until, v_is_banned
  FROM users
  WHERE id = v_user_id
  FOR UPDATE; -- lock user row for penalty update

  IF v_penalty_count IS NULL THEN
    v_penalty_count := 0;
  END IF;

  -- Check if banned
  IF v_is_banned THEN
    RETURN jsonb_build_object('success', false, 'message', 'Permanent ban cannot be lifted');
  END IF;

  -- Check active penalty
  IF v_penalty_until IS NULL OR v_penalty_until <= v_now THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active penalty to lift');
  END IF;

  -- Determine cost based on current penalty level
  IF v_penalty_count = 1 THEN
    v_cost := 30;
  ELSIF v_penalty_count = 2 THEN
    v_cost := 90;
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'This penalty cannot be lifted');
  END IF;

  -- Fetch and lock points balance
  SELECT balance INTO v_balance
  FROM user_points
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Points record not found');
  END IF;

  IF v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient points', 'balance', v_balance, 'required', v_cost);
  END IF;

  -- Deduct points
  v_new_balance := v_balance - v_cost;
  UPDATE user_points SET balance = v_new_balance WHERE user_id = v_user_id;

  -- Log transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (v_user_id, -v_cost, 'PENALTY_LIFT', v_balance, v_new_balance, jsonb_build_object('penalty_count', v_penalty_count));

  -- Clear penalty
  UPDATE users SET penalty_until = NULL WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Penalty lifted', 'balance', v_new_balance, 'points_spent', v_cost);
END;
$$;

COMMENT ON FUNCTION lift_penalty_with_points IS 'Atomically lifts a 30min/90min penalty by spending SmartPoints (30/90).';
GRANT EXECUTE ON FUNCTION lift_penalty_with_points TO authenticated;