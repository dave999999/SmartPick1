-- Update is_user_in_cooldown to use daily count instead of 30-minute window
-- This matches the warning system (daily cancellation tracking)

-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS is_user_in_cooldown(UUID);

CREATE OR REPLACE FUNCTION is_user_in_cooldown(p_user_id UUID)
RETURNS TABLE(
  in_cooldown BOOLEAN,
  cooldown_until TIMESTAMPTZ,
  cancellation_count INTEGER,
  reset_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_oldest_time TIMESTAMPTZ;
  v_latest_time TIMESTAMPTZ;
  v_cooldown_until TIMESTAMPTZ;
  v_reset_count INTEGER;
BEGIN
  -- Count cancellations that happened TODAY (current calendar day)
  SELECT
    COUNT(*),
    MIN(u.cancelled_at),
    MAX(u.cancelled_at),
    MAX(COALESCE(u.reset_count, 0))
  INTO v_count, v_oldest_time, v_latest_time, v_reset_count
  FROM user_cancellation_tracking u
  WHERE u.user_id = p_user_id
    AND u.cancelled_at >= CURRENT_DATE; -- Only count TODAY's cancellations

  -- Check if user has lifted cooldown today
  IF EXISTS (
    SELECT 1 FROM user_cooldown_lifts
    WHERE user_id = p_user_id
      AND lifted_at >= CURRENT_DATE
      AND lifted_at >= v_latest_time  -- Lifted after latest cancellation
  ) THEN
    -- Cooldown was lifted, allow reservation
    RETURN QUERY SELECT 
      FALSE,
      NULL::TIMESTAMPTZ,
      v_count,
      COALESCE(v_reset_count, 0);
    RETURN;
  END IF;

  -- User is in cooldown if they have 3+ cancellations today
  IF v_count >= 5 THEN
    -- 5+ cancellations = blocked until midnight (next day) - NO LIFT OPTION
    v_cooldown_until := (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ;
    
    RETURN QUERY SELECT 
      TRUE,
      v_cooldown_until,
      v_count,
      COALESCE(v_reset_count, 0);
      
  ELSIF v_count >= 3 THEN
    -- 3-4 cancellations = 1 hour cooldown from latest cancellation
    v_cooldown_until := v_latest_time + INTERVAL '1 hour';
    
    -- If cooldown already expired, not in cooldown anymore
    IF v_cooldown_until <= NOW() THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::TIMESTAMPTZ,
        v_count,
        COALESCE(v_reset_count, 0);
    ELSE
      -- Still in cooldown
      RETURN QUERY SELECT 
        TRUE,
        v_cooldown_until,
        v_count,
        COALESCE(v_reset_count, 0);
    END IF;
  ELSE
    -- Not in cooldown
    RETURN QUERY SELECT 
      FALSE,
      NULL::TIMESTAMPTZ,
      v_count,
      COALESCE(v_reset_count, 0);
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_user_in_cooldown TO authenticated;

-- Test it
SELECT * FROM is_user_in_cooldown('ceb0217b-26f6-445a-a8b2-3807401deca9');
