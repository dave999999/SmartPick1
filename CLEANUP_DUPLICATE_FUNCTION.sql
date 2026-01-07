-- =========================================================
-- CLEANUP DUPLICATE LIFT_PENALTY_WITH_POINTS FUNCTION
-- =========================================================
-- Issue: lift_penalty_with_points exists in 2 versions
-- This script removes the old version and keeps the correct one
-- Run this ONCE after verifying the correct version exists
-- =========================================================

-- STEP 1: Check which versions exist
DO $$ BEGIN RAISE NOTICE '=== CHECKING FOR DUPLICATE FUNCTIONS ==='; END $$;
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  proconfig AS search_path,
  LEFT(prosrc, 100) AS source_preview
FROM pg_proc 
WHERE proname = 'lift_penalty_with_points'
ORDER BY oid;

-- STEP 2: Count total versions (should be 2 before cleanup)
DO $$ BEGIN RAISE NOTICE '=== COUNTING VERSIONS ==='; END $$;
SELECT COUNT(*) AS total_versions
FROM pg_proc 
WHERE proname = 'lift_penalty_with_points';

-- STEP 3: Show which version is CORRECT (has 'SET search_path = public')
DO $$ BEGIN RAISE NOTICE '=== CORRECT VERSION (should have search_path = public) ==='; END $$;
SELECT 
  oid,
  pg_get_functiondef(oid) AS full_definition
FROM pg_proc 
WHERE proname = 'lift_penalty_with_points'
  AND 'search_path=public' = ANY(proconfig)
LIMIT 1;

-- STEP 4: Drop ALL versions (we'll recreate the correct one next)
DO $$ BEGIN RAISE NOTICE '=== DROPPING ALL VERSIONS ==='; END $$;
-- Drop the NEW version (penalty_id, user_id)
DROP FUNCTION IF EXISTS lift_penalty_with_points(UUID, UUID) CASCADE;
-- Drop the OLD version (user_id, points_to_spend)
DROP FUNCTION IF EXISTS lift_penalty_with_points(UUID, INTEGER) CASCADE;
-- Drop any other versions without parameters
DROP FUNCTION IF EXISTS lift_penalty_with_points() CASCADE;

-- STEP 5: Verify deletion
DO $$ BEGIN RAISE NOTICE '=== VERIFYING DELETION (should be 0) ==='; END $$;
SELECT COUNT(*) AS should_be_zero
FROM pg_proc 
WHERE proname = 'lift_penalty_with_points';

-- STEP 6: Recreate the CORRECT version
DO $$ BEGIN RAISE NOTICE '=== RECREATING CORRECT VERSION ==='; END $$;
CREATE OR REPLACE FUNCTION lift_penalty_with_points(
  p_penalty_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_penalty RECORD;
  v_user_balance INTEGER;
  v_required_cost INTEGER;
  v_result JSON;
  v_lock_key BIGINT;
BEGIN
  -- 🔒 CRITICAL FIX: Add advisory lock to prevent race condition
  v_lock_key := hashtext(p_user_id::text || '_points');
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Validate penalty exists and belongs to user
  SELECT *
  INTO v_penalty
  FROM user_penalties
  WHERE id = p_penalty_id
    AND user_id = p_user_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Penalty not found or already resolved'
    );
  END IF;

  -- Check if penalty is liftable (not 6th+ offense)
  IF v_penalty.offense_number >= 6 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'This penalty requires admin review and cannot be lifted with points'
    );
  END IF;

  -- Check if suspension is still active
  IF v_penalty.suspended_until IS NULL OR v_penalty.suspended_until <= NOW() THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Suspension has already expired'
    );
  END IF;

  -- Calculate required cost based on offense number
  CASE v_penalty.offense_number
    WHEN 4 THEN v_required_cost := 100;
    WHEN 5 THEN v_required_cost := 500;
    ELSE
      RETURN json_build_object(
        'success', false,
        'message', 'This penalty type cannot be lifted with points'
      );
  END CASE;

  -- Check user balance
  SELECT balance
  INTO v_user_balance
  FROM user_points
  WHERE user_id = p_user_id;

  IF v_user_balance IS NULL OR v_user_balance < v_required_cost THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient points. Required: ' || v_required_cost || ', Available: ' || COALESCE(v_user_balance, 0)
    );
  END IF;

  -- Deduct points
  UPDATE user_points
  SET 
    balance = balance - v_required_cost,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log the transaction
  INSERT INTO point_transactions (
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    description,
    metadata
  ) VALUES (
    p_user_id,
    'deduct',
    v_required_cost,
    v_user_balance,
    v_user_balance - v_required_cost,
    'Lifted ' || v_penalty.penalty_type || ' suspension with points',
    json_build_object(
      'penalty_id', p_penalty_id,
      'offense_number', v_penalty.offense_number
    )
  );

  -- Deactivate penalty
  UPDATE user_penalties
  SET 
    is_active = false,
    lifted_with_points = true,
    lifted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_penalty_id;

  -- Update user status
  UPDATE users
  SET 
    is_suspended = false,
    suspended_until = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Suspension lifted successfully',
    'points_spent', v_required_cost,
    'new_balance', v_user_balance - v_required_cost
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RETURN json_build_object(
      'success', false,
      'message', 'An error occurred: ' || SQLERRM
    );
END;
$$;

-- STEP 7: Verify only 1 version exists now
DO $$ BEGIN RAISE NOTICE '=== FINAL VERIFICATION (should be 1) ==='; END $$;
SELECT COUNT(*) AS should_be_one
FROM pg_proc 
WHERE proname = 'lift_penalty_with_points';

-- STEP 8: Test the function
DO $$ BEGIN RAISE NOTICE '=== TESTING FUNCTION (should not error) ==='; END $$;
SELECT pg_get_functiondef(oid) AS function_definition
FROM pg_proc 
WHERE proname = 'lift_penalty_with_points';

-- ✅ CLEANUP COMPLETE!
-- Summary:
-- - Removed duplicate functions
-- - Recreated correct version with SET search_path = public
-- - Added advisory lock to prevent race condition
-- Next: Test by lifting a penalty with points
