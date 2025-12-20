-- =====================================================
-- PROGRESSIVE COOLDOWN LIFT SYSTEM
-- =====================================================
-- Feature: Users can lift cooldowns by paying points
-- - 1st time: Free reset (checkbox acknowledgment)
-- - 2nd time: Pay 50 points
-- - 3rd time: Pay 100 points
-- - 4th+ time: Pay 150, 200, 250... (increases by 50)
-- =====================================================

-- Step 1: Add reset_count column to track how many times user has reset
ALTER TABLE user_cancellation_tracking
ADD COLUMN IF NOT EXISTS reset_count INT DEFAULT 0;

-- Step 1b: Make reservation_id nullable (needed for tracking resets without actual reservations)
ALTER TABLE user_cancellation_tracking
ALTER COLUMN reservation_id DROP NOT NULL;

-- Step 1c: Update is_user_in_cooldown to return reset_count
DROP FUNCTION IF EXISTS public.is_user_in_cooldown(UUID);

CREATE OR REPLACE FUNCTION is_user_in_cooldown(p_user_id UUID)
RETURNS TABLE(
  in_cooldown BOOLEAN,
  cooldown_end TIMESTAMPTZ,
  cancellation_count BIGINT,
  reset_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH recent_cancellations AS (
    SELECT 
      COUNT(*) as cancel_count,
      MAX(uct.cancelled_at) + INTERVAL '1 hour' as calculated_cooldown_end,
      COALESCE(MAX(uct.reset_count), 0) as max_reset_count
    FROM user_cancellation_tracking uct
    WHERE uct.user_id = p_user_id
      AND uct.cancelled_at >= NOW() - INTERVAL '30 minutes'
  )
  SELECT 
    CASE 
      WHEN rc.cancel_count >= 3 AND rc.calculated_cooldown_end > NOW() THEN TRUE
      ELSE FALSE
    END as in_cooldown,
    rc.calculated_cooldown_end as cooldown_end,
    rc.cancel_count as cancellation_count,
    rc.max_reset_count as reset_count
  FROM recent_cancellations rc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_user_in_cooldown TO authenticated;

-- Step 1d: Update can_user_reserve to use new cooldown system
DROP FUNCTION IF EXISTS public.can_user_reserve(UUID);

CREATE OR REPLACE FUNCTION can_user_reserve(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_cooldown_info RECORD;
  v_user_balance INT;
BEGIN
  -- Check cooldown status using updated function
  SELECT * INTO v_cooldown_info
  FROM is_user_in_cooldown(p_user_id);
  
  IF v_cooldown_info.in_cooldown THEN
    RETURN jsonb_build_object(
      'can_reserve', false,
      'reason', 'cooldown',
      'cooldown_end', v_cooldown_info.cooldown_end,
      'reset_count', v_cooldown_info.reset_count
    );
  END IF;
  
  -- Check if user has enough points for reservation
  SELECT balance INTO v_user_balance
  FROM user_points
  WHERE user_id = p_user_id;
  
  IF v_user_balance < 5 THEN
    RETURN jsonb_build_object(
      'can_reserve', false,
      'reason', 'insufficient_points',
      'current_balance', v_user_balance,
      'required', 5
    );
  END IF;
  
  RETURN jsonb_build_object(
    'can_reserve', true,
    'reason', null
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_user_reserve TO authenticated;

-- Step 2: Create function to lift cooldown by spending points
DROP FUNCTION IF EXISTS public.lift_cooldown_with_points(UUID);

CREATE OR REPLACE FUNCTION lift_cooldown_with_points(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_reset_count INT;
  v_points_cost INT;
  v_current_balance INT;
  v_cooldown_status RECORD;
BEGIN
  -- Get current reset count
  SELECT COALESCE(MAX(reset_count), 0) INTO v_reset_count
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id;
  
  -- Check if user is actually in cooldown
  SELECT * INTO v_cooldown_status
  FROM is_user_in_cooldown(p_user_id);
  
  IF NOT v_cooldown_status.in_cooldown THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You are not in cooldown'
    );
  END IF;
  
  -- Calculate cost based on reset count
  -- First time free (handled by different function)
  -- 2nd time: 50, 3rd: 100, 4th: 150, etc.
  v_points_cost := v_reset_count * 50;
  
  IF v_points_cost = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Use free reset for first cooldown'
    );
  END IF;
  
  -- Check user balance
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = p_user_id;
  
  IF v_current_balance < v_points_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient points',
      'required', v_points_cost,
      'current', v_current_balance
    );
  END IF;
  
  -- Deduct points
  PERFORM set_config('app.is_system_operation', 'true', true);
  
  PERFORM add_user_points(
    p_user_id,
    -v_points_cost,
    'cooldown_lift',
    jsonb_build_object(
      'reset_count', v_reset_count + 1,
      'points_spent', v_points_cost
    )
  );
  
  -- Clear cooldown (delete cancellation records)
  DELETE FROM user_cancellation_tracking
  WHERE user_id = p_user_id;
  
  -- Re-insert one record to track that reset was used
  INSERT INTO user_cancellation_tracking (user_id, cancelled_at, reset_count)
  VALUES (p_user_id, NOW() - INTERVAL '2 hours', v_reset_count + 1);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cooldown lifted successfully',
    'points_spent', v_points_cost,
    'reset_count', v_reset_count + 1,
    'new_balance', v_current_balance - v_points_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION lift_cooldown_with_points TO authenticated;

-- Step 3: Update free reset function to increment counter
DROP FUNCTION IF EXISTS public.reset_user_cooldown(UUID);

CREATE OR REPLACE FUNCTION reset_user_cooldown(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_reset_count INT;
  v_cooldown_status RECORD;
BEGIN
  -- Get current reset count
  SELECT COALESCE(MAX(reset_count), 0) INTO v_reset_count
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id;
  
  -- Check if user is in cooldown
  SELECT * INTO v_cooldown_status
  FROM is_user_in_cooldown(p_user_id);
  
  IF NOT v_cooldown_status.in_cooldown THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You are not in cooldown'
    );
  END IF;
  
  -- Only allow free reset once (first time)
  IF v_reset_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Free reset already used. Use points to lift cooldown.',
      'points_required', (v_reset_count + 1) * 50
    );
  END IF;
  
  -- Clear cooldown
  DELETE FROM user_cancellation_tracking
  WHERE user_id = p_user_id;
  
  -- Re-insert one record to track that first reset was used
  INSERT INTO user_cancellation_tracking (user_id, cancelled_at, reset_count)
  VALUES (p_user_id, NOW() - INTERVAL '2 hours', 1);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cooldown reset successfully. This was your one-time free reset.',
    'reset_count', 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_user_cooldown TO authenticated;

COMMENT ON FUNCTION lift_cooldown_with_points IS 
'Lifts cooldown by spending points. Cost increases: 50, 100, 150... based on reset count.';

COMMENT ON FUNCTION reset_user_cooldown IS 
'Free one-time cooldown reset. Subsequent resets require points via lift_cooldown_with_points.';

SELECT '✅ Progressive cooldown lift system implemented' as status;
