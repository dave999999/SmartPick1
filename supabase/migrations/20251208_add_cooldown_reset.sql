-- Add cooldown reset functionality
-- Allows users to reset one-time with escalation to 45 minutes if they cancel again

-- Add columns to track reset (if not already present)
ALTER TABLE public.user_cancellation_tracking
ADD COLUMN IF NOT EXISTS reset_cooldown_used BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cooldown_duration_minutes INTEGER DEFAULT 30;

-- Update existing function to include reset and duration info
CREATE OR REPLACE FUNCTION get_user_consecutive_cancellations(p_user_id UUID)
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
  v_cooldown_duration INTEGER;
BEGIN
  -- Get cancellation count and reset status in last active cooldown period
  SELECT
    COUNT(*) AS cancellation_count,
    MIN(u.cancelled_at) AS oldest_time,
    MAX(CASE WHEN u.reset_cooldown_used THEN 1 ELSE 0 END)::BOOLEAN AS reset_used,
    MAX(u.cooldown_duration_minutes) AS cooldown_minutes
  INTO v_count, v_oldest_time, v_reset_used, v_cooldown_duration
  FROM user_cancellation_tracking u
  WHERE u.user_id = p_user_id
    AND u.cancelled_at > NOW() - INTERVAL '45 minutes'; -- Check up to 45 min window

  -- Use cooldown duration from database (30 or 45 min)
  v_cooldown_duration := COALESCE(v_cooldown_duration, 30);

  -- Calculate when cooldown ends based on duration
  IF v_oldest_time IS NOT NULL THEN
    v_cooldown_until := v_oldest_time + (v_cooldown_duration || ' minutes')::INTERVAL;
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_consecutive_cancellations TO authenticated;

-- Create function to reset user's cooldown (one-time use)
CREATE OR REPLACE FUNCTION reset_user_cooldown(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_active_cooldown BOOLEAN;
  v_already_used_reset BOOLEAN;
BEGIN
  -- Check if user has active cooldown
  SELECT EXISTS(
    SELECT 1 FROM public.user_cancellation_tracking u
    WHERE u.user_id = p_user_id
      AND u.reset_cooldown_used = FALSE
      AND u.cancelled_at > NOW() - (u.cooldown_duration_minutes || ' minutes')::INTERVAL
    LIMIT 1
  ) INTO v_has_active_cooldown;

  IF NOT v_has_active_cooldown THEN
    RETURN QUERY SELECT FALSE, 'No active cooldown to reset';
    RETURN;
  END IF;

  -- Check if user already used reset for this cooldown
  SELECT EXISTS(
    SELECT 1 FROM public.user_cancellation_tracking u
    WHERE u.user_id = p_user_id
      AND u.reset_cooldown_used = TRUE
      AND u.cancelled_at > NOW() - INTERVAL '45 minutes'
    LIMIT 1
  ) INTO v_already_used_reset;

  IF v_already_used_reset THEN
    RETURN QUERY SELECT FALSE, 'You have already used your reset for this cooldown period';
    RETURN;
  END IF;

  -- Mark the reset as used on the oldest active cancellation record
  UPDATE public.user_cancellation_tracking
  SET reset_cooldown_used = TRUE
  WHERE id = (
    SELECT id FROM public.user_cancellation_tracking u
    WHERE u.user_id = p_user_id
      AND u.reset_cooldown_used = FALSE
      AND u.cancelled_at > NOW() - INTERVAL '45 minutes'
    ORDER BY u.cancelled_at ASC
    LIMIT 1
  );

  RETURN QUERY SELECT TRUE, 'Cooldown reset successfully. Be careful - next cancellation will result in 45-minute ban';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION reset_user_cooldown TO authenticated;

-- Create function to escalate cooldown to 45 minutes when user cancels after reset
CREATE OR REPLACE FUNCTION escalate_cooldown_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset_was_used BOOLEAN;
BEGIN
  -- Check if user had used reset before this cancellation
  SELECT MAX(CASE WHEN u.reset_cooldown_used THEN 1 ELSE 0 END)::BOOLEAN
  INTO v_reset_was_used
  FROM user_cancellation_tracking u
  WHERE u.user_id = NEW.customer_id
    AND u.reset_cooldown_used = TRUE
    AND u.cancelled_at > NOW() - INTERVAL '45 minutes';

  -- If reset was used, escalate new cancellation to 45 minutes
  IF v_reset_was_used THEN
    UPDATE user_cancellation_tracking
    SET cooldown_duration_minutes = 45
    WHERE id = (
      SELECT id FROM user_cancellation_tracking
      WHERE user_id = NEW.customer_id
        AND reservation_id = NEW.id
      LIMIT 1
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION escalate_cooldown_on_cancel TO authenticated;

-- Update is_user_in_cooldown to use variable cooldown duration
CREATE OR REPLACE FUNCTION is_user_in_cooldown(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_oldest_time TIMESTAMPTZ;
  v_cooldown_duration INTEGER;
BEGIN
  -- Get cancellation count and duration in last 45 minutes
  SELECT COUNT(*), MIN(u.cancelled_at), MAX(u.cooldown_duration_minutes)
  INTO v_count, v_oldest_time, v_cooldown_duration
  FROM user_cancellation_tracking u
  WHERE u.user_id = p_user_id
    AND u.cancelled_at > NOW() - INTERVAL '45 minutes';

  v_cooldown_duration := COALESCE(v_cooldown_duration, 30);

  -- User is in cooldown if they have 3+ cancellations and the cooldown period hasn't passed
  IF v_count >= 3 AND v_oldest_time + (v_cooldown_duration || ' minutes')::INTERVAL > NOW() THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_user_in_cooldown TO authenticated;

-- Update track_reservation_cancellation trigger to handle escalation
CREATE OR REPLACE FUNCTION track_reservation_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reset_was_used BOOLEAN;
  v_new_record_id UUID;
BEGIN
  -- Only track if status changed to CANCELLED
  IF NEW.status = 'CANCELLED' AND (OLD.status IS NULL OR OLD.status != 'CANCELLED') THEN
    -- Check if user had used reset before this cancellation
    SELECT MAX(CASE WHEN u.reset_cooldown_used THEN 1 ELSE 0 END)::BOOLEAN
    INTO v_reset_was_used
    FROM user_cancellation_tracking u
    WHERE u.user_id = NEW.customer_id
      AND u.reset_cooldown_used = TRUE
      AND u.cancelled_at > NOW() - INTERVAL '45 minutes';

    -- Insert into cancellation tracking with escalated duration if needed
    INSERT INTO user_cancellation_tracking (
      user_id, 
      reservation_id, 
      cancelled_at,
      cooldown_duration_minutes
    )
    VALUES (
      NEW.customer_id, 
      NEW.id, 
      NOW(),
      CASE WHEN v_reset_was_used THEN 45 ELSE 30 END
    )
    ON CONFLICT (reservation_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION reset_user_cooldown IS
  'Allows user to reset their active cooldown once. Next cancellation will escalate to 45-minute ban.';

COMMENT ON FUNCTION escalate_cooldown_on_cancel IS
  'Escalates cooldown to 45 minutes if user cancels after using reset.';
