-- Fix: 5+ cancellations should reset at midnight (count yesterday's cancels as 0 today)
-- The issue: is_user_in_cooldown counts ALL cancellations with cancelled_at >= CURRENT_DATE
-- But if cancels happened YESTERDAY, v_count should be 0 TODAY

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

  -- If no cancellations today, user is NOT in cooldown (fresh start!)
  IF v_count = 0 THEN
    RETURN QUERY SELECT 
      FALSE,
      NULL::TIMESTAMPTZ,
      0,
      0;
    RETURN;
  END IF;

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
    
    -- Check if it's already past midnight (new day started)
    IF v_cooldown_until <= NOW() THEN
      -- Cooldown expired, fresh start
      RETURN QUERY SELECT 
        FALSE,
        NULL::TIMESTAMPTZ,
        v_count,  -- Keep count for history but allow reservation
        COALESCE(v_reset_count, 0);
    ELSE
      -- Still blocked until midnight
      RETURN QUERY SELECT 
        TRUE,
        v_cooldown_until,
        v_count,
        COALESCE(v_reset_count, 0);
    END IF;
      
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

-- Test with your user
SELECT * FROM is_user_in_cooldown('ceb0217b-26f6-445a-a8b2-3807401deca9');

-- Check their cancellation count for TODAY
SELECT COUNT(*) as todays_cancels
FROM user_cancellation_tracking
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND cancelled_at >= CURRENT_DATE;

-- Should show 0 cancellations if they cancelled yesterday!
