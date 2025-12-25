-- Fix: Use Georgia timezone (Asia/Tbilisi) for daily reset, not UTC
-- Problem: CURRENT_DATE uses server timezone (UTC), but users are in Georgia (UTC+4)
-- When it's Dec 26 00:30 in Georgia, it's still Dec 25 20:30 in UTC

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
  v_georgia_date DATE;
BEGIN
  -- Get current date in Georgia timezone (UTC+4)
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  -- Count cancellations that happened TODAY in Georgia time
  SELECT
    COUNT(*),
    MIN(u.cancelled_at),
    MAX(u.cancelled_at),
    MAX(COALESCE(u.reset_count, 0))
  INTO v_count, v_oldest_time, v_latest_time, v_reset_count
  FROM user_cancellation_tracking u
  WHERE u.user_id = p_user_id
    AND (u.cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;

  -- If no cancellations today, user is NOT in cooldown (fresh start!)
  IF v_count = 0 THEN
    RETURN QUERY SELECT 
      FALSE,
      NULL::TIMESTAMPTZ,
      0,
      0;
    RETURN;
  END IF;

  -- Check if user has lifted cooldown today (Georgia time)
  IF EXISTS (
    SELECT 1 FROM user_cooldown_lifts
    WHERE user_id = p_user_id
      AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date
      AND lifted_at >= v_latest_time
  ) THEN
    RETURN QUERY SELECT 
      FALSE,
      NULL::TIMESTAMPTZ,
      v_count,
      COALESCE(v_reset_count, 0);
    RETURN;
  END IF;

  -- User is in cooldown if they have 3+ cancellations today
  IF v_count >= 5 THEN
    -- 5+ cancellations = blocked until midnight Georgia time
    v_cooldown_until := (v_georgia_date + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Tbilisi';
    
    -- Check if it's already past midnight Georgia time
    IF v_cooldown_until <= NOW() THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::TIMESTAMPTZ,
        v_count,
        COALESCE(v_reset_count, 0);
    ELSE
      RETURN QUERY SELECT 
        TRUE,
        v_cooldown_until,
        v_count,
        COALESCE(v_reset_count, 0);
    END IF;
      
  ELSIF v_count >= 3 THEN
    -- 3-4 cancellations = 1 hour cooldown
    v_cooldown_until := v_latest_time + INTERVAL '1 hour';
    
    IF v_cooldown_until <= NOW() THEN
      RETURN QUERY SELECT 
        FALSE,
        NULL::TIMESTAMPTZ,
        v_count,
        COALESCE(v_reset_count, 0);
    ELSE
      RETURN QUERY SELECT 
        TRUE,
        v_cooldown_until,
        v_count,
        COALESCE(v_reset_count, 0);
    END IF;
  ELSE
    RETURN QUERY SELECT 
      FALSE,
      NULL::TIMESTAMPTZ,
      v_count,
      COALESCE(v_reset_count, 0);
  END IF;
END;
$$;

-- Update get_user_daily_cancellation_count to use Georgia timezone too
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
AS $$
DECLARE
  v_count INTEGER;
  v_oldest_time TIMESTAMPTZ;
  v_reset_used BOOLEAN;
  v_cooldown_duration INTEGER;
  v_georgia_date DATE;
BEGIN
  -- Get current date in Georgia timezone
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  -- Count cancellations that happened TODAY in Georgia time
  SELECT
    COUNT(*) AS cancellation_count,
    MIN(u.cancelled_at) AS oldest_time,
    MAX(CASE WHEN u.reset_cooldown_used THEN 1 ELSE 0 END)::BOOLEAN AS reset_used,
    MAX(u.cooldown_duration_minutes) AS cooldown_minutes
  INTO v_count, v_oldest_time, v_reset_used, v_cooldown_duration
  FROM user_cancellation_tracking u
  WHERE u.user_id = p_user_id
    AND (u.cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;

  v_cooldown_duration := COALESCE(v_cooldown_duration, 30);

  RETURN QUERY
  SELECT 
    COALESCE(v_count, 0)::INTEGER,
    v_oldest_time,
    COALESCE(v_reset_used, FALSE),
    v_cooldown_duration;
END;
$$;

GRANT EXECUTE ON FUNCTION is_user_in_cooldown TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_daily_cancellation_count TO authenticated;

-- ========================================
-- VERIFICATION QUERIES (run these to test)
-- ========================================

-- 1. Check what date it is in Georgia vs UTC
SELECT 
  (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE as georgia_date,
  CURRENT_DATE as utc_date,
  NOW() AT TIME ZONE 'Asia/Tbilisi' as georgia_time;

-- 2. Count cancellations using Georgia timezone
SELECT COUNT(*) as todays_cancels_georgia_time
FROM user_cancellation_tracking
WHERE user_id = 'ceb0217b-26f6-445a-a8b2-3807401deca9'
  AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

-- 3. Check cooldown status (should return in_cooldown=false if new day)
SELECT * FROM is_user_in_cooldown('ceb0217b-26f6-445a-a8b2-3807401deca9');
