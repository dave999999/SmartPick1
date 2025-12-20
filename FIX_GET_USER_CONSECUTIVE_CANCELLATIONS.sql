-- =====================================================
-- FIX: Update get_user_consecutive_cancellations to Match 1-Hour Cooldown
-- =====================================================
-- Problem: Button disabled even though can_user_reserve says true
-- Cause: get_user_consecutive_cancellations checks 45min window but cooldown is 1 hour
-- Solution: Update to check 1-hour window and auto-clear expired cancellations
-- =====================================================

DROP FUNCTION IF EXISTS public.get_user_consecutive_cancellations(UUID);

CREATE OR REPLACE FUNCTION public.get_user_consecutive_cancellations(p_user_id UUID)
RETURNS TABLE(
  cancellation_count INTEGER,
  oldest_cancellation_time TIMESTAMPTZ,
  time_until_unlock INTERVAL,
  reset_cooldown_used BOOLEAN,
  cooldown_duration_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_oldest_time TIMESTAMPTZ;
  v_cooldown_until TIMESTAMPTZ;
  v_reset_used BOOLEAN;
  v_cooldown_duration INTEGER := 60; -- 1 hour in minutes
BEGIN
  -- Clean up cancellations older than 1 hour
  DELETE FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND cancelled_at < NOW() - INTERVAL '1 hour';

  -- Get cancellation count in last 30 minutes (trigger window)
  SELECT
    COUNT(*) AS cancellation_count,
    MIN(u.cancelled_at) AS oldest_time,
    MAX(CASE WHEN u.reset_cooldown_used THEN 1 ELSE 0 END)::BOOLEAN AS reset_used
  INTO v_count, v_oldest_time, v_reset_used
  FROM user_cancellation_tracking u
  WHERE u.user_id = p_user_id
    AND u.cancelled_at > NOW() - INTERVAL '30 minutes';

  -- If 3+ cancellations in 30 min, cooldown is 1 HOUR from oldest
  IF v_count >= 3 AND v_oldest_time IS NOT NULL THEN
    v_cooldown_until := v_oldest_time + INTERVAL '1 hour';
    
    -- If cooldown expired, clear all cancellations
    IF v_cooldown_until <= NOW() THEN
      DELETE FROM user_cancellation_tracking WHERE user_id = p_user_id;
      v_count := 0;
      v_oldest_time := NULL;
      v_cooldown_until := NULL;
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(v_count, 0)::INTEGER,
    v_oldest_time,
    GREATEST(v_cooldown_until - NOW(), INTERVAL '0')::INTERVAL,
    COALESCE(v_reset_used, FALSE),
    v_cooldown_duration;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_consecutive_cancellations TO authenticated;

COMMENT ON FUNCTION public.get_user_consecutive_cancellations IS 
'Gets user cancellation count (last 30min), auto-clears if 1-hour cooldown expired. Returns count, oldest time, time until unlock, reset status, and cooldown duration.';

SELECT '✅ Fixed: get_user_consecutive_cancellations now matches 1-hour cooldown' as status;
