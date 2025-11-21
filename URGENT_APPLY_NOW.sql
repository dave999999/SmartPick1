-- ============================================================================
-- 🚨 URGENT: APPLY THIS IMMEDIATELY IN SUPABASE SQL EDITOR
-- ============================================================================
--
-- YOUR DATABASE IS VULNERABLE!
-- Current permissions: authenticated CAN call add_user_points
-- This allows users to give themselves unlimited points!
--
-- This script will:
-- 1. Remove authenticated/anon access immediately
-- 2. Secure the function to service_role only
-- 3. Update function logic with stricter checks
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: IMMEDIATE LOCKDOWN - REVOKE ALL USER ACCESS
-- ============================================================================

REVOKE ALL ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM authenticated;
REVOKE ALL ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) FROM PUBLIC;

-- Also secure deduct if it exists
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION deduct_user_points(UUID, INT, TEXT, JSONB) FROM authenticated';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION deduct_user_points(UUID, INT, TEXT, JSONB) FROM anon';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- ============================================================================
-- STEP 2: GRANT ONLY TO SERVICE_ROLE
-- ============================================================================

GRANT EXECUTE ON FUNCTION add_user_points(UUID, INT, TEXT, JSONB) TO service_role;

DO $$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION deduct_user_points(UUID, INT, TEXT, JSONB) TO service_role';
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- ============================================================================
-- STEP 3: UPDATE FUNCTION WITH STRICTER SECURITY
-- ============================================================================

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
    INSERT INTO user_points (user_id, balance)
    VALUES (p_user_id, GREATEST(0, p_amount))
    ON CONFLICT (user_id) DO UPDATE SET balance = user_points.balance + p_amount
    RETURNING balance INTO v_new_balance;

    v_current_balance := 0;
  ELSE
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_user_points IS
'SECURE: Only callable by service_role or SECURITY DEFINER functions with app.is_system_operation flag. Users CANNOT call directly.';

-- ============================================================================
-- STEP 4: VERIFY FIX
-- ============================================================================

DO $$ 
DECLARE
  v_permissions TEXT[];
BEGIN
  -- Check current permissions
  SELECT array_agg(pg_catalog.pg_get_userbyid(acl.grantee))
  INTO v_permissions
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  LEFT JOIN LATERAL (SELECT (aclexplode(p.proacl)).grantee) acl ON true
  WHERE n.nspname = 'public' AND p.proname = 'add_user_points'
  GROUP BY p.proname;

  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  CRITICAL SECURITY FIX APPLIED                               ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 VULNERABILITY FIXED!';
  RAISE NOTICE '';
  RAISE NOTICE 'Function: add_user_points';
  RAISE NOTICE 'Permissions BEFORE: authenticated, anon (VULNERABLE)';
  RAISE NOTICE 'Permissions NOW: service_role ONLY (SECURE)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Users can NO LONGER give themselves points';
  RAISE NOTICE '✅ Only backend (service_role) can modify points';
  RAISE NOTICE '✅ Amount validation added (max 10,000)';
  RAISE NOTICE '✅ Negative balance prevention enabled';
  RAISE NOTICE '';
  RAISE NOTICE 'Users can still earn points through:';
  RAISE NOTICE '  • claim_achievement() function';
  RAISE NOTICE '  • Backend Edge Functions';
  RAISE NOTICE '  • Automated rewards (pickups, referrals)';
  RAISE NOTICE '';
  RAISE NOTICE 'Current permissions: %', v_permissions;
  RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY - RUN THIS AFTER TO CONFIRM
-- ============================================================================

-- This should show only: {postgres, service_role}
SELECT 
  p.proname as function_name,
  array_agg(pg_catalog.pg_get_userbyid(acl.grantee)) as who_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN LATERAL (SELECT (aclexplode(p.proacl)).grantee) acl ON true
WHERE n.nspname = 'public' AND p.proname = 'add_user_points'
GROUP BY p.proname;
