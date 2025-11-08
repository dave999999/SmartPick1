-- Harden points-related SECURITY DEFINER functions without changing external logic
-- 1. Recreate add_user_points with internal auth.uid() validation and amount constraints
-- 2. Restrict EXECUTE privileges (remove anon; limit to authenticated only for claim & lift)
-- 3. Ensure achievement claiming still works (claim_achievement keeps authenticated access)
-- 4. Keep lift_penalty_with_points accessible to authenticated users only
-- NOTE: If a backend service layer is adopted later, further restrict to service_role.

BEGIN;

-- Safely drop previous insecure grants (ignore errors)
DO $$ BEGIN
  BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM anon'; EXCEPTION WHEN others THEN END; END $$;
DO $$ BEGIN
  BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM authenticated'; EXCEPTION WHEN others THEN END; END $$;
DO $$ BEGIN
  BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION claim_achievement(TEXT) FROM anon'; EXCEPTION WHEN others THEN END; END $$;

-- Recreate add_user_points with internal identity check
CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
  v_auth UUID := auth.uid();
BEGIN
  -- Enforce auth presence
  IF v_auth IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Prevent escalating other users' balances
  IF v_auth <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot modify another user');
  END IF;

  -- Basic input validation (logic kept same, just guard rails)
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Zero amount not allowed');
  END IF;
  IF p_amount > 1000 THEN -- hard cap to prevent accidental massive awards
    RETURN jsonb_build_object('success', false, 'message', 'Amount too large');
  END IF;
  IF p_amount < -1000 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Negative amount too large');
  END IF;

  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    INSERT INTO user_points (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE SET balance = user_points.balance + EXCLUDED.balance
    RETURNING balance INTO v_new_balance;

    v_current_balance := 0;
  ELSE
    v_new_balance := v_current_balance + p_amount;
    UPDATE user_points SET balance = v_new_balance WHERE user_id = p_user_id;
  END IF;

  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (p_user_id, p_amount, p_reason, v_current_balance, v_new_balance, p_metadata)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object('success', true, 'balance', v_new_balance, 'transaction_id', v_transaction_id);
END;$$;
COMMENT ON FUNCTION add_user_points IS 'Secure: validates auth.uid() matches p_user_id and caps amount.';

-- Re-grant only to authenticated (frontend user context) and service_role (backend); remove anon
GRANT EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) TO service_role;

-- Adjust claim_achievement: remove anon grant (authenticated only)
DO $$ BEGIN
  BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION claim_achievement(TEXT) FROM anon'; EXCEPTION WHEN others THEN END; END $$;
GRANT EXECUTE ON FUNCTION claim_achievement(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_achievement(TEXT) TO service_role;

-- Ensure lift_penalty_with_points not granted to anon
DO $$ BEGIN
  BEGIN EXECUTE 'REVOKE EXECUTE ON FUNCTION public.lift_penalty_with_points() FROM anon'; EXCEPTION WHEN others THEN END; END $$;
GRANT EXECUTE ON FUNCTION public.lift_penalty_with_points() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lift_penalty_with_points() TO service_role;

-- OPTIONAL: Future tightening (commented)
-- REVOKE EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM authenticated;
-- Keep only claim_achievement for user initiated point awards.

COMMIT;
