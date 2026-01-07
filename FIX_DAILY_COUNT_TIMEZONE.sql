-- Fix: get_user_daily_cancellation_count to use Georgia timezone
-- Must match what is_user_in_cooldown uses

-- Drop existing function first
DROP FUNCTION IF EXISTS get_user_daily_cancellation_count(UUID);

CREATE OR REPLACE FUNCTION get_user_daily_cancellation_count(p_user_id UUID)
RETURNS TABLE(
  cancellation_count INTEGER,
  oldest_cancellation_time TIMESTAMPTZ,
  reset_cooldown_used BOOLEAN,
  cooldown_duration_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
  v_oldest_time TIMESTAMPTZ;
  v_reset_used BOOLEAN;
  v_cooldown_duration INTEGER;
  v_georgia_date DATE;
BEGIN
  -- Get current date in Georgia timezone (same as is_user_in_cooldown)
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  -- Count cancellations that happened TODAY in Georgia timezone
  SELECT
    COUNT(*) AS cancellation_count,
    MIN(u.cancelled_at) AS oldest_time,
    MAX(CASE WHEN u.reset_cooldown_used THEN 1 ELSE 0 END)::BOOLEAN AS reset_used,
    MAX(u.cooldown_duration_minutes) AS cooldown_minutes
  INTO v_count, v_oldest_time, v_reset_used, v_cooldown_duration
  FROM user_cancellation_tracking u
  WHERE u.user_id = p_user_id
    AND (u.cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;

  -- Use cooldown duration from database (default 30 minutes)
  v_cooldown_duration := COALESCE(v_cooldown_duration, 30);

  RETURN QUERY
  SELECT 
    COALESCE(v_count, 0)::INTEGER,
    v_oldest_time,
    COALESCE(v_reset_used, FALSE),
    v_cooldown_duration;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_daily_cancellation_count TO authenticated;

-- Test it
SELECT * FROM get_user_daily_cancellation_count(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);
