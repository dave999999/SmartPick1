-- =====================================================
-- UPDATE COOLDOWN DURATION FROM 30 MIN TO 1 HOUR
-- To match the educational message in the UI
-- =====================================================

-- Update is_user_in_cooldown function to use 1 hour cooldown
CREATE OR REPLACE FUNCTION is_user_in_cooldown(p_user_id UUID)
RETURNS TABLE (
  in_cooldown BOOLEAN,
  cooldown_until TIMESTAMPTZ,
  cancellation_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_oldest_time TIMESTAMPTZ;
  v_cooldown_until TIMESTAMPTZ;
BEGIN
  -- Get cancellation count in last 30 minutes (trigger window)
  SELECT COUNT(*), MIN(cancelled_at)
  INTO v_count, v_oldest_time
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND cancelled_at > NOW() - INTERVAL '30 minutes';

  -- If 3+ cancellations in 30 min, cooldown is 1 HOUR from the oldest cancellation
  IF v_count >= 3 THEN
    v_cooldown_until := v_oldest_time + INTERVAL '1 hour';
    
    IF v_cooldown_until > NOW() THEN
      -- Still in cooldown
      RETURN QUERY SELECT TRUE, v_cooldown_until, v_count;
    ELSE
      -- Cooldown expired
      RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, v_count;
    END IF;
  ELSE
    -- Not enough cancellations to trigger cooldown
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, v_count;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION is_user_in_cooldown TO authenticated;

COMMENT ON FUNCTION is_user_in_cooldown IS 
'Checks if user is in 1-hour cooldown after 3 cancellations in 30 minutes. Returns cooldown status, expiry time, and cancel count.';

SELECT '✅ Updated cooldown duration to 1 HOUR' as status;
SELECT 'Trigger: 3 cancels in 30min → Cooldown: 1 hour' as behavior;
