-- ============================================
-- STEP 2: LIFT PENALTY WITH POINTS FUNCTION
-- ============================================
-- Allow users to pay points to remove suspension early
-- ============================================

CREATE OR REPLACE FUNCTION lift_penalty_with_points(
  p_penalty_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_penalty RECORD;
  v_current_balance INTEGER;
  v_points_cost INTEGER;
  v_new_balance INTEGER;
  v_result JSON;
BEGIN
  -- Step 1: Get penalty details and lock row
  SELECT * INTO v_penalty
  FROM user_penalties
  WHERE id = p_penalty_id AND user_id = p_user_id AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Penalty not found or already lifted';
  END IF;

  -- Step 2: Check if penalty can be lifted with points
  IF NOT v_penalty.can_lift_with_points THEN
    RAISE EXCEPTION 'This penalty cannot be lifted with points';
  END IF;

  -- Step 2.5: Prevent lifting 6th+ offenses (admin review required)
  IF v_penalty.offense_number >= 6 THEN
    RAISE EXCEPTION 'This penalty requires admin review. Please contact support.';
  END IF;

  -- Step 3: Check if suspension is still active
  IF v_penalty.suspended_until IS NOT NULL AND v_penalty.suspended_until <= NOW() THEN
    RAISE EXCEPTION 'Suspension has already expired';
  END IF;

  -- Step 4: Calculate points cost
  v_points_cost := calculate_lift_points(v_penalty.offense_number);
  
  IF v_points_cost = 0 THEN
    RAISE EXCEPTION 'Cannot calculate points cost for this offense';
  END IF;

  -- Step 5: Get user balance and lock
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'User points record not found';
  END IF;

  IF v_current_balance < v_points_cost THEN
    RAISE EXCEPTION 'Insufficient points. Need % points, have % points.', v_points_cost, v_current_balance;
  END IF;

  -- Step 6: Deduct points
  v_new_balance := v_current_balance - v_points_cost;
  
  UPDATE user_points
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Step 7: Log the transaction
  INSERT INTO point_transactions (
    user_id,
    change,
    reason,
    balance_before,
    balance_after,
    metadata
  ) VALUES (
    p_user_id,
    -v_points_cost,
    'PENALTY_LIFTED',
    v_current_balance,
    v_new_balance,
    jsonb_build_object(
      'penalty_id', p_penalty_id,
      'offense_number', v_penalty.offense_number,
      'penalty_type', v_penalty.penalty_type,
      'lifted_at', NOW()
    )
  );

  -- Step 8: Deactivate the penalty
  UPDATE user_penalties
  SET 
    is_active = false,
    acknowledged = true,
    acknowledged_at = NOW(),
    updated_at = NOW()
  WHERE id = p_penalty_id;

  -- Step 9: Update user suspended status
  UPDATE users
  SET 
    is_suspended = false,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Step 10: Build success response
  SELECT json_build_object(
    'success', true,
    'penalty_lifted', true,
    'points_spent', v_points_cost,
    'new_balance', v_new_balance,
    'is_suspended', false,
    'message', 'Penalty successfully lifted!'
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error as JSON
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION lift_penalty_with_points(UUID, UUID) TO authenticated;

-- Verify function created
SELECT 
  'FUNCTION CREATED ✅' as status,
  proname as function_name,
  pg_get_function_arguments(oid) as parameters
FROM pg_proc
WHERE proname = 'lift_penalty_with_points';

-- ============================================
-- RESULT
-- ============================================
-- ✅ lift_penalty_with_points() function created
-- ✅ Validates penalty, checks balance, deducts points
-- ✅ Deactivates penalty and updates user status
-- ✅ Returns JSON with success/error
-- Ready to use from frontend!
-- ============================================
