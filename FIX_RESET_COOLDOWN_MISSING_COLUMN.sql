-- =========================================================
-- FIX reset_user_cooldown TO WORK WITHOUT in_cooldown COLUMN
-- =========================================================
-- Issue: Function tries to use users.in_cooldown column which doesn't exist
-- Solution: Check cooldown status via is_user_in_cooldown() function instead
-- =========================================================

-- Drop the broken version
DROP FUNCTION IF EXISTS reset_user_cooldown(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS reset_user_cooldown(UUID) CASCADE;

-- Recreate CORRECT version (uses is_user_in_cooldown function, not column)
CREATE OR REPLACE FUNCTION reset_user_cooldown(
  p_user_id UUID,
  p_lift_type TEXT DEFAULT 'free'
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  cooldown_lifted BOOLEAN,
  points_spent INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_georgia_date DATE;
  v_cancellation_count INTEGER;
  v_cooldown_status RECORD;
  v_required_points INTEGER := 0;
  v_user_balance INTEGER;
BEGIN
  -- Get current date in Georgia timezone
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  -- 🔒 CRITICAL FIX: Check if already lifted today
  IF EXISTS (
    SELECT 1 FROM user_cooldown_lifts
    WHERE user_id = p_user_id
      AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date
  ) THEN
    RETURN QUERY SELECT 
      FALSE,
      'You have already lifted cooldown today. Try again after midnight (Georgia time).'::TEXT,
      FALSE,
      0;
    RETURN;
  END IF;
  
  -- Get current cancellation count (today only)
  SELECT COUNT(*) INTO v_cancellation_count
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;
  
  -- ✅ FIX: Check cooldown status via function (not column)
  SELECT * INTO v_cooldown_status
  FROM is_user_in_cooldown(p_user_id)
  LIMIT 1;
  
  IF NOT v_cooldown_status.in_cooldown THEN
    RETURN QUERY SELECT 
      FALSE,
      'You are not in cooldown'::TEXT,
      FALSE,
      0;
    RETURN;
  END IF;
  
  -- Determine required points based on cancellation count
  CASE 
    WHEN v_cancellation_count = 3 THEN
      v_required_points := 0; -- FREE lift
    WHEN v_cancellation_count = 4 THEN
      v_required_points := 100;
    WHEN v_cancellation_count >= 5 THEN
      RETURN QUERY SELECT 
        FALSE,
        'You have reached the daily cancellation limit. Cooldown will reset at midnight (Georgia time).'::TEXT,
        FALSE,
        0;
      RETURN;
    ELSE
      RETURN QUERY SELECT 
        FALSE,
        'You need at least 3 cancellations to lift cooldown'::TEXT,
        FALSE,
        0;
      RETURN;
  END CASE;
  
  -- If paid lift, check balance
  IF v_required_points > 0 THEN
    SELECT balance INTO v_user_balance
    FROM user_points
    WHERE user_id = p_user_id;
    
    IF v_user_balance < v_required_points THEN
      RETURN QUERY SELECT 
        FALSE,
        format('Insufficient points. Required: %s, Available: %s', v_required_points, v_user_balance),
        FALSE,
        0;
      RETURN;
    END IF;
    
    -- Deduct points
    UPDATE user_points
    SET balance = balance - v_required_points,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Log transaction
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
      v_required_points,
      v_user_balance,
      v_user_balance - v_required_points,
      'Lifted cancellation cooldown',
      json_build_object(
        'cancellation_count', v_cancellation_count,
        'lift_type', 'paid'
      )
    );
  END IF;
  
  -- Record cooldown lift
  INSERT INTO user_cooldown_lifts (
    user_id,
    lift_type,
    points_spent,
    cancellation_count_at_lift,
    lifted_at
  ) VALUES (
    p_user_id,
    CASE WHEN v_required_points = 0 THEN 'free' ELSE 'paid' END,
    v_required_points,
    v_cancellation_count,
    NOW()
  );
  
  -- ✅ FIX: Clear cancellation tracking instead of updating non-existent column
  DELETE FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;
  
  -- Return success
  RETURN QUERY SELECT 
    TRUE,
    'Cooldown lifted successfully!'::TEXT,
    TRUE,
    v_required_points;

EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT 
      FALSE,
      'You have already lifted cooldown today'::TEXT,
      FALSE,
      0;
  WHEN OTHERS THEN
    RETURN QUERY SELECT 
      FALSE,
      'Error: ' || SQLERRM,
      FALSE,
      0;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_user_cooldown TO authenticated;

-- Verify function exists
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments
FROM pg_proc 
WHERE proname = 'reset_user_cooldown';

-- ✅ FIX COMPLETE!
-- Changes:
-- - Removed reference to non-existent users.in_cooldown column
-- - Uses is_user_in_cooldown() function to check status
-- - Deletes cancellation records instead of updating column
-- - Cooldown automatically clears when records are deleted
