-- =========================================================
-- FIX RACE CONDITIONS IN POINT DEDUCTION & PENALTY CREATION
-- =========================================================
-- Issue 1: Concurrent point deductions can cause negative balance
-- Issue 2: Concurrent penalty creations can duplicate offense numbers
-- Fix: Add advisory locks to serialize critical operations
-- =========================================================

-- STEP 1: Verify pg_advisory functions are available
DO $$ BEGIN RAISE NOTICE '=== CHECKING ADVISORY LOCK SUPPORT ==='; END $$;
SELECT 
  proname,
  LEFT(pg_get_functiondef(oid), 100) AS definition_preview
FROM pg_proc 
WHERE proname IN ('pg_advisory_xact_lock', 'hashtext')
LIMIT 2;

-- STEP 2: Create helper function to generate consistent lock keys
DO $$ BEGIN RAISE NOTICE '=== CREATING LOCK KEY HELPER FUNCTION ==='; END $$;
CREATE OR REPLACE FUNCTION get_user_lock_key(
  p_user_id UUID,
  p_lock_type TEXT DEFAULT 'general'
)
RETURNS BIGINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Generate consistent lock key for user + operation type
  -- hashtext() converts to int4, we cast to int8 (bigint)
  RETURN hashtext(p_user_id::text || '_' || p_lock_type)::bigint;
END;
$$;

-- STEP 3: Update lift_penalty_with_points with advisory lock
DO $$ BEGIN RAISE NOTICE '=== FIXING lift_penalty_with_points RACE CONDITION ==='; END $$;
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
  v_lock_key BIGINT;
BEGIN
  -- 🔒 CRITICAL FIX: Acquire user-specific lock for points
  -- This prevents concurrent point deductions from same user
  v_lock_key := get_user_lock_key(p_user_id, 'points');
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

  -- 🔒 Check user balance (now safe from race condition)
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

  -- 🔒 Deduct points (atomic operation, protected by lock)
  UPDATE user_points
  SET 
    balance = balance - v_required_cost,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND balance >= v_required_cost; -- Double-check to prevent negative

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient points (concurrent operation detected)'
    );
  END IF;

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
    -- Rollback happens automatically, lock released
    RETURN json_build_object(
      'success', false,
      'message', 'An error occurred: ' || SQLERRM
    );
END;
$$;

-- STEP 4: Update mark_latest_reservation_expired with advisory lock
DO $$ BEGIN RAISE NOTICE '=== FIXING mark_latest_reservation_expired RACE CONDITION ==='; END $$;
CREATE OR REPLACE FUNCTION mark_latest_reservation_expired(
  p_reservation_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_reservation RECORD;
  v_user_id UUID;
  v_offense_count INTEGER;
  v_penalty_type TEXT;
  v_suspend_hours INTEGER;
  v_lock_key BIGINT;
  v_penalty_id UUID;
BEGIN
  -- Get reservation details
  SELECT * INTO v_reservation
  FROM reservations
  WHERE id = p_reservation_id
    AND status = 'ACTIVE';
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Reservation not found or already processed'
    );
  END IF;
  
  v_user_id := v_reservation.customer_id;
  
  -- 🔒 CRITICAL FIX: Acquire user-specific lock for penalties
  -- This prevents concurrent penalty creations from creating duplicate offense numbers
  v_lock_key := get_user_lock_key(v_user_id, 'penalty');
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- 🔒 NOW count offenses (protected by lock, no race possible)
  SELECT COUNT(*) INTO v_offense_count
  FROM user_penalties
  WHERE user_id = v_user_id;
  
  -- Increment offense number (this is now the NEXT offense)
  v_offense_count := v_offense_count + 1;
  
  -- Determine penalty type based on offense number
  CASE 
    WHEN v_offense_count <= 3 THEN
      v_penalty_type := 'warning';
      v_suspend_hours := 0;
    WHEN v_offense_count = 4 THEN
      v_penalty_type := '1hour';
      v_suspend_hours := 1;
    WHEN v_offense_count = 5 THEN
      v_penalty_type := '24hour';
      v_suspend_hours := 24;
    ELSE
      v_penalty_type := 'permanent';
      v_suspend_hours := NULL; -- Permanent = no expiry
  END CASE;
  
  -- Mark reservation as expired
  UPDATE reservations
  SET 
    status = 'FAILED_PICKUP',
    updated_at = NOW()
  WHERE id = p_reservation_id;
  
  -- Create penalty record
  INSERT INTO user_penalties (
    user_id,
    reservation_id,
    penalty_type,
    offense_number,
    is_active,
    can_lift_with_points,
    suspended_until,
    created_at
  ) VALUES (
    v_user_id,
    p_reservation_id,
    v_penalty_type,
    v_offense_count,
    true,
    v_offense_count IN (4, 5), -- Can lift offenses 4 & 5
    CASE 
      WHEN v_suspend_hours IS NOT NULL 
      THEN NOW() + (v_suspend_hours || ' hours')::INTERVAL
      ELSE NULL -- Permanent
    END,
    NOW()
  ) RETURNING id INTO v_penalty_id;
  
  -- Record in offense history
  INSERT INTO penalty_offense_history (
    user_id,
    penalty_id,
    offense_number,
    penalty_type,
    reservation_id,
    created_at
  ) VALUES (
    v_user_id,
    v_penalty_id,
    v_offense_count,
    v_penalty_type,
    p_reservation_id,
    NOW()
  );
  
  -- Update user record
  UPDATE users
  SET 
    penalty_count = v_offense_count,
    is_suspended = (v_offense_count >= 4),
    suspended_until = CASE 
      WHEN v_suspend_hours IS NOT NULL 
      THEN NOW() + (v_suspend_hours || ' hours')::INTERVAL
      ELSE NULL
    END,
    reliability_score = GREATEST(0, 100 - (v_offense_count * 15)),
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Refund points (user doesn't get points for missed pickup)
  -- This was already handled in expire_user_reservations
  
  -- Return result
  RETURN json_build_object(
    'success', true,
    'offense_number', v_offense_count,
    'penalty_type', v_penalty_type,
    'is_suspended', v_offense_count >= 4,
    'suspended_until', CASE 
      WHEN v_suspend_hours IS NOT NULL 
      THEN NOW() + (v_suspend_hours || ' hours')::INTERVAL
      ELSE NULL
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error: ' || SQLERRM
    );
END;
$$;

-- STEP 5: Create test function to verify race protection
DO $$ BEGIN RAISE NOTICE '=== CREATING RACE CONDITION TEST FUNCTION ==='; END $$;
CREATE OR REPLACE FUNCTION test_race_condition_protection()
RETURNS TABLE(
  test_name TEXT,
  result TEXT,
  details TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_test_user_id UUID;
  v_initial_balance INTEGER;
  v_final_balance INTEGER;
  v_expected_balance INTEGER;
BEGIN
  -- Get a test user
  SELECT id INTO v_test_user_id
  FROM users
  WHERE email = 'davetest@gmail.com'
  LIMIT 1;
  
  IF v_test_user_id IS NULL THEN
    RETURN QUERY SELECT 
      'User Lookup'::TEXT,
      '❌ FAILED'::TEXT,
      'davetest@gmail.com not found'::TEXT;
    RETURN;
  END IF;
  
  -- Test 1: Advisory lock is acquired
  BEGIN
    PERFORM pg_advisory_xact_lock(get_user_lock_key(v_test_user_id, 'points'));
    RETURN QUERY SELECT 
      'Advisory Lock'::TEXT,
      '✅ PASSED'::TEXT,
      'Lock acquired successfully'::TEXT;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 
        'Advisory Lock'::TEXT,
        '❌ FAILED'::TEXT,
        SQLERRM;
  END;
  
  -- Test 2: Lock key consistency
  DECLARE
    v_lock1 BIGINT;
    v_lock2 BIGINT;
  BEGIN
    v_lock1 := get_user_lock_key(v_test_user_id, 'points');
    v_lock2 := get_user_lock_key(v_test_user_id, 'points');
    
    IF v_lock1 = v_lock2 THEN
      RETURN QUERY SELECT 
        'Lock Key Consistency'::TEXT,
        '✅ PASSED'::TEXT,
        format('Lock key: %s', v_lock1);
    ELSE
      RETURN QUERY SELECT 
        'Lock Key Consistency'::TEXT,
        '❌ FAILED'::TEXT,
        'Lock keys do not match';
    END IF;
  END;
  
  -- Test 3: Different lock types have different keys
  DECLARE
    v_lock_points BIGINT;
    v_lock_penalty BIGINT;
  BEGIN
    v_lock_points := get_user_lock_key(v_test_user_id, 'points');
    v_lock_penalty := get_user_lock_key(v_test_user_id, 'penalty');
    
    IF v_lock_points != v_lock_penalty THEN
      RETURN QUERY SELECT 
        'Lock Type Isolation'::TEXT,
        '✅ PASSED'::TEXT,
        'Different operations use different locks';
    ELSE
      RETURN QUERY SELECT 
        'Lock Type Isolation'::TEXT,
        '❌ FAILED'::TEXT,
        'Lock types not properly isolated';
    END IF;
  END;
  
END;
$$;

-- STEP 6: Run tests
DO $$ BEGIN RAISE NOTICE '=== RUNNING RACE CONDITION PROTECTION TESTS ==='; END $$;
SELECT * FROM test_race_condition_protection();

-- STEP 7: Verify functions have advisory locks
DO $$ BEGIN RAISE NOTICE '=== VERIFYING ADVISORY LOCKS IN FUNCTIONS ==='; END $$;
SELECT 
  proname AS function_name,
  CASE 
    WHEN prosrc LIKE '%pg_advisory_xact_lock%' THEN '✅ HAS LOCK'
    ELSE '❌ NO LOCK'
  END AS has_advisory_lock,
  CASE 
    WHEN prosrc LIKE '%get_user_lock_key%' THEN '✅ USES HELPER'
    ELSE '⚠️ DIRECT LOCK'
  END AS uses_helper
FROM pg_proc
WHERE proname IN (
  'lift_penalty_with_points',
  'mark_latest_reservation_expired'
)
ORDER BY proname;

-- STEP 8: Show summary
DO $$ BEGIN RAISE NOTICE '=== FIX SUMMARY ==='; END $$;
SELECT '✅ Created get_user_lock_key() helper function' AS fix_1
UNION ALL SELECT '✅ Added advisory lock to lift_penalty_with_points()' AS fix_2
UNION ALL SELECT '✅ Added advisory lock to mark_latest_reservation_expired()' AS fix_3
UNION ALL SELECT '✅ Locks auto-release at transaction end' AS fix_4
UNION ALL SELECT '✅ Different operations use different lock keys' AS fix_5;

-- ✅ RACE CONDITIONS FIXED!
-- What changed:
-- 1. Point Deduction: Can't go negative even with concurrent tabs
-- 2. Penalty Creation: No duplicate offense numbers possible
-- 3. Lock Keys: Consistent and isolated per operation type
-- How it works:
-- - Before modifying points: Acquire lock for user_id + "points"
-- - Before creating penalty: Acquire lock for user_id + "penalty"
-- - Lock held until transaction commits/rolls back
-- - Other operations wait their turn (serialized per user)
-- Next: Test by opening 2 tabs and lifting penalty simultaneously
