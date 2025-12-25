-- Fix cancellation counting to be per calendar day, not 45-minute window
-- This is for the WARNING system (not the cooldown system)

CREATE OR REPLACE FUNCTION get_user_daily_cancellation_count(p_user_id UUID)
RETURNS TABLE(
  cancellation_count INTEGER,
  oldest_cancellation_time TIMESTAMPTZ,
  reset_cooldown_used BOOLEAN,
  cooldown_duration_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_oldest_time TIMESTAMPTZ;
  v_reset_used BOOLEAN;
  v_cooldown_duration INTEGER;
BEGIN
  -- Count cancellations that happened TODAY (current calendar day)
  SELECT
    COUNT(*) AS cancellation_count,
    MIN(u.cancelled_at) AS oldest_time,
    MAX(CASE WHEN u.reset_cooldown_used THEN 1 ELSE 0 END)::BOOLEAN AS reset_used,
    MAX(u.cooldown_duration_minutes) AS cooldown_minutes
  INTO v_count, v_oldest_time, v_reset_used, v_cooldown_duration
  FROM user_cancellation_tracking u
  WHERE u.user_id = p_user_id
    AND u.cancelled_at >= CURRENT_DATE; -- Only count TODAY's cancellations

  -- Use cooldown duration from database (30 or 45 min)
  v_cooldown_duration := COALESCE(v_cooldown_duration, 30);

  RETURN QUERY
  SELECT 
    COALESCE(v_count, 0)::INTEGER,
    v_oldest_time,
    COALESCE(v_reset_used, FALSE),
    v_cooldown_duration;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_daily_cancellation_count TO authenticated;

-- Test the function with your user
SELECT * FROM get_user_daily_cancellation_count('ceb0217b-26f6-445a-a8b2-3807401deca9');
