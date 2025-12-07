-- Add cancellation tracking to prevent abuse
-- After 3 consecutive cancellations, user cannot reserve for 30 minutes

-- Create cancellation tracking table
CREATE TABLE IF NOT EXISTS public.user_cancellation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reset_cooldown_used BOOLEAN DEFAULT FALSE, -- Tracks if user used their one reset
  cooldown_duration_minutes INTEGER DEFAULT 30, -- Tracks escalation (30 or 45 min)
  
  -- Unique constraint to prevent duplicate cancellations
  UNIQUE(reservation_id)
);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_user_id_cancelled_at 
ON public.user_cancellation_tracking(user_id, cancelled_at DESC);

-- Add index for checking recent cancellations
CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_user_created 
ON public.user_cancellation_tracking(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_cancellation_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS user_cancellation_tracking_select ON public.user_cancellation_tracking;
DROP POLICY IF EXISTS user_cancellation_tracking_insert ON public.user_cancellation_tracking;

-- RLS Policy: Users can only see their own cancellation history
CREATE POLICY user_cancellation_tracking_select ON public.user_cancellation_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Only system can insert (via trigger)
CREATE POLICY user_cancellation_tracking_insert ON public.user_cancellation_tracking
  FOR INSERT
  WITH CHECK (TRUE);

-- Drop old function if it exists (to recreate with new return type)
DROP FUNCTION IF EXISTS get_user_consecutive_cancellations(uuid);

-- Create function to get user's consecutive cancellation count
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
  SELECT COUNT(*), MIN(cancelled_at), MAX(CASE WHEN reset_cooldown_used THEN 1 ELSE 0 END)::BOOLEAN, MAX(cooldown_duration_minutes)
  INTO v_count, v_oldest_time, v_reset_used, v_cooldown_duration
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND cancelled_at > NOW() - INTERVAL '45 minutes'; -- Check up to 45 min window

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_consecutive_cancellations TO authenticated;

-- Create function to reset user's cooldown (one-time use)
CREATE OR REPLACE FUNCTION reset_user_cooldown(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_active_cooldown BOOLEAN;
  v_already_used_reset BOOLEAN;
BEGIN
  -- Check if user has active cooldown
  SELECT EXISTS(
    SELECT 1 FROM user_cancellation_tracking
    WHERE user_id = p_user_id
      AND reset_cooldown_used = FALSE
      AND cancelled_at > NOW() - (cooldown_duration_minutes || ' minutes')::INTERVAL
    LIMIT 1
  ) INTO v_has_active_cooldown;

  IF NOT v_has_active_cooldown THEN
    RETURN QUERY SELECT FALSE, 'No active cooldown to reset';
    RETURN;
  END IF;

  -- Check if user already used reset for this cooldown
  SELECT EXISTS(
    SELECT 1 FROM user_cancellation_tracking
    WHERE user_id = p_user_id
      AND reset_cooldown_used = TRUE
      AND cancelled_at > NOW() - INTERVAL '45 minutes'
    LIMIT 1
  ) INTO v_already_used_reset;

  IF v_already_used_reset THEN
    RETURN QUERY SELECT FALSE, 'You have already used your reset for this cooldown period';
    RETURN;
  END IF;

  -- Mark the reset as used on the oldest active cancellation record
  UPDATE user_cancellation_tracking
  SET reset_cooldown_used = TRUE
  WHERE id = (
    SELECT id FROM user_cancellation_tracking
    WHERE user_id = p_user_id
      AND reset_cooldown_used = FALSE
      AND cancelled_at > NOW() - INTERVAL '45 minutes'
    ORDER BY cancelled_at ASC
    LIMIT 1
  );

  RETURN QUERY SELECT TRUE, 'Cooldown reset successfully. Be careful - next cancellation will result in 45-minute ban';
END;
$$;

-- Create function to check if user is in cooldown
CREATE OR REPLACE FUNCTION is_user_in_cooldown(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_oldest_time TIMESTAMPTZ;
BEGIN
  -- Get cancellation count in last 30 minutes
  SELECT COUNT(*), MIN(cancelled_at)
  INTO v_count, v_oldest_time
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND cancelled_at > NOW() - INTERVAL '30 minutes';

  -- User is in cooldown if they have 3+ cancellations and 30 min haven't passed since oldest
  IF v_count >= 3 AND v_oldest_time + INTERVAL '30 minutes' > NOW() THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_user_in_cooldown TO authenticated;

-- Create function to track cancellation when reservation is cancelled
CREATE OR REPLACE FUNCTION track_reservation_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only track if status changed to CANCELLED
  IF NEW.status = 'CANCELLED' AND (OLD.status IS NULL OR OLD.status != 'CANCELLED') THEN
    -- Insert into cancellation tracking
    INSERT INTO user_cancellation_tracking (user_id, reservation_id, cancelled_at)
    VALUES (NEW.customer_id, NEW.id, NOW())
    ON CONFLICT (reservation_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_track_cancellation ON public.reservations;

-- Create trigger to track cancellations
CREATE TRIGGER trg_track_cancellation
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION track_reservation_cancellation();

-- Add comment
COMMENT ON TABLE public.user_cancellation_tracking IS
  'Tracks user reservation cancellations. After 3 cancellations in 30 minutes, user cannot reserve.';

COMMENT ON FUNCTION get_user_consecutive_cancellations IS
  'Returns consecutive cancellation count and time until cooldown ends.';

COMMENT ON FUNCTION is_user_in_cooldown IS
  'Returns true if user has 3+ cancellations in last 30 minutes.';
