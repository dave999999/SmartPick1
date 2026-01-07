-- =========================================================
-- FIX lift_penalty_with_points FUNCTION
-- =========================================================
-- Remove invalid 'type' column from point_transactions INSERT
-- =========================================================

CREATE OR REPLACE FUNCTION public.lift_penalty_with_points(
  p_penalty_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_penalty RECORD;
  v_points_cost INTEGER;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get penalty details
  SELECT * INTO v_penalty
  FROM user_penalties
  WHERE id = p_penalty_id
    AND user_id = p_user_id
    AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Penalty not found or already lifted'
    );
  END IF;
  
  -- Calculate points cost
  v_points_cost := CASE
    WHEN v_penalty.offense_number = 4 THEN 100
    WHEN v_penalty.offense_number = 5 THEN 500
    ELSE 1000
  END;
  
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id;
  
  IF v_current_balance < v_points_cost THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient points'
    );
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance - v_points_cost;
  
  -- Update user points
  UPDATE user_points
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Record transaction (NO 'type' column)
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
  
  -- Deactivate the penalty
  UPDATE user_penalties
  SET is_active = false,
      acknowledged = true,
      acknowledged_at = NOW(),
      updated_at = NOW()
  WHERE id = p_penalty_id;
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'points_spent', v_points_cost
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'An error occurred: ' || SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION lift_penalty_with_points(UUID, UUID) TO authenticated;

-- Test the function
SELECT lift_penalty_with_points(
  (SELECT id FROM user_penalties WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com') AND is_active = true LIMIT 1),
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
) as result;
