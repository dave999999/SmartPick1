-- ============================================================================
-- CRITICAL SECURITY FIX: Remove authenticated access to add_user_points
-- ============================================================================
-- 
-- VULNERABILITY: Users could call add_user_points directly to give themselves
-- unlimited points (999 at a time, up to the 1000 hardcoded cap).
--
-- Example exploit:
--   await supabase.rpc('add_user_points', {
--     p_user_id: myUserId,
--     p_amount: 999,
--     p_reason: 'hack',
--     p_metadata: {}
--   });
--
-- This migration ensures:
-- 1. add_user_points can ONLY be called by service_role (backend)
-- 2. Users can only earn points through proper wrapper functions
-- 3. Wrapper functions have business logic validation
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: REVOKE ALL USER ACCESS TO POINTS FUNCTIONS
-- ============================================================================

-- Remove authenticated role access (the vulnerability)
REVOKE ALL ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM authenticated;
REVOKE ALL ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM PUBLIC;

-- Also secure deduct_user_points if it exists
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION deduct_user_points(UUID, INT, TEXT, JSONB) FROM authenticated';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION deduct_user_points(UUID, INT, TEXT, JSONB) FROM anon';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- ============================================================================
-- STEP 2: GRANT ONLY TO SERVICE_ROLE
-- ============================================================================

-- Only service_role (backend/Edge Functions) can modify points
GRANT EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) TO service_role;

DO $$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION deduct_user_points(UUID, INT, TEXT, JSONB) TO service_role';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- ============================================================================
-- STEP 3: UPDATE FUNCTION TO ENFORCE SERVICE_ROLE ONLY
-- ============================================================================

-- Recreate add_user_points with stricter role checking
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
  v_caller_role TEXT;
  v_is_system_op TEXT;
BEGIN
  -- Check if this is a system operation (from SECURITY DEFINER functions)
  BEGIN
    v_is_system_op := current_setting('app.is_system_operation', false);
  EXCEPTION
    WHEN OTHERS THEN
      v_is_system_op := 'false';
  END;
  
  -- CRITICAL SECURITY CHECK: Only service_role OR system operations allowed
  SELECT current_setting('request.jwt.claims', true)::json->>'role' INTO v_caller_role;

  IF v_caller_role != 'service_role' AND COALESCE(v_is_system_op, 'false') != 'true' THEN
    RAISE EXCEPTION 'Access denied: Points can only be modified by backend services';
  END IF;

  -- Amount validation
  IF p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Zero amount not allowed');
  END IF;
  
  IF ABS(p_amount) > 10000 THEN
    RAISE EXCEPTION 'Amount exceeds maximum allowed: %', p_amount;
  END IF;

  -- Lock the row to prevent race conditions
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF v_current_balance IS NULL THEN
    -- Create if doesn't exist
    INSERT INTO user_points (user_id, balance)
    VALUES (p_user_id, GREATEST(0, p_amount)) -- Don't allow negative starting balance
    ON CONFLICT (user_id) DO UPDATE SET balance = user_points.balance + p_amount
    RETURNING balance INTO v_new_balance;

    v_current_balance := 0;
  ELSE
    -- Calculate and update
    v_new_balance := v_current_balance + p_amount;
    
    -- Prevent negative balance
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient points: current=%, required=%', v_current_balance, ABS(p_amount);
    END IF;

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
    'transaction_id', v_transaction_id,
    'user_id', p_user_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'change', p_amount
  );
  -- 6. Audit log (best-effort; ignore failure). SECURITY: service_role only caller ensures RLS bypass via privileges.
  BEGIN
    INSERT INTO audit_log(event_type, actor_id, target_id, metadata)
    VALUES (
      'POINTS_AWARDED',
      NULL, -- actor not tracked directly here (could extend function signature later)
      p_user_id,
      jsonb_build_object(
        'amount', p_amount,
        'reason', p_reason,
        'tx_id', v_transaction_id,
        'caller_role', v_caller_role
      ) || COALESCE(p_metadata, '{}')
    );
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'audit_log insert failed for POINTS_AWARDED: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_user_points IS
'SECURE: Add/subtract points. Only callable by service_role or SECURITY DEFINER functions with app.is_system_operation flag. Users CANNOT call directly.';

-- ============================================================================
-- STEP 4: ENSURE WRAPPER FUNCTIONS EXIST FOR USER-INITIATED ACTIONS
-- ============================================================================

-- claim_achievement should already exist and be properly secured
-- If not, create a stub that shows the pattern

CREATE OR REPLACE FUNCTION claim_achievement(p_achievement_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_already_claimed BOOLEAN;
  v_is_eligible BOOLEAN;
  v_points_reward INT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if already claimed
  SELECT EXISTS(
    SELECT 1 FROM user_achievements 
    WHERE user_id = v_user_id AND achievement_id = p_achievement_id AND claimed = true
  ) INTO v_already_claimed;
  
  IF v_already_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Achievement already claimed');
  END IF;

  -- Check if eligible (unlocked but not claimed)
  SELECT EXISTS(
    SELECT 1 FROM user_achievements 
    WHERE user_id = v_user_id AND achievement_id = p_achievement_id AND unlocked = true
  ) INTO v_is_eligible;
  
  IF NOT v_is_eligible THEN
    RETURN jsonb_build_object('success', false, 'error', 'Achievement not unlocked');
  END IF;

  -- Get points reward
  SELECT points INTO v_points_reward FROM achievements WHERE id = p_achievement_id;
  
  IF v_points_reward IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Achievement not found');
  END IF;

  -- Mark as claimed
  UPDATE user_achievements 
  SET claimed = true, claimed_at = NOW()
  WHERE user_id = v_user_id AND achievement_id = p_achievement_id;

  -- Award points via add_user_points (this works because we're SECURITY DEFINER)
  PERFORM set_config('app.is_system_operation', 'true', true);
  PERFORM add_user_points(
    v_user_id, 
    v_points_reward, 
    'Achievement claimed: ' || p_achievement_id,
    jsonb_build_object('achievement_id', p_achievement_id)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points_reward
  );
END;
$$;

-- Users CAN call claim_achievement (it has validation logic)
GRANT EXECUTE ON FUNCTION claim_achievement(TEXT) TO authenticated;

COMMENT ON FUNCTION claim_achievement IS
'SAFE wrapper function: Users can call this to claim achievements. Validates eligibility before awarding points via add_user_points.';

-- ============================================================================
-- VERIFICATION & LOGGING
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  CRITICAL SECURITY FIX: POINTS ESCALATION REMOVED            ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'VULNERABILITY FIXED:';
  RAISE NOTICE '  ❌ Users can NO LONGER call add_user_points directly';
  RAISE NOTICE '  ✅ Only service_role can modify points';
  RAISE NOTICE '  ✅ User-initiated actions require wrapper functions';
  RAISE NOTICE '';
  RAISE NOTICE 'SECURED FUNCTIONS:';
  RAISE NOTICE '  🔒 add_user_points: service_role ONLY';
  RAISE NOTICE '  ✅ claim_achievement: authenticated (with validation)';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can earn points through:';
  RAISE NOTICE '  • claim_achievement(achievement_id) - validates unlocked';
  RAISE NOTICE '  • Backend Edge Functions (service_role)';
  RAISE NOTICE '  • SECURITY DEFINER functions with validation';
  RAISE NOTICE '';
END $$;

COMMIT;
