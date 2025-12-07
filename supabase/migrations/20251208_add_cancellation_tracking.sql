-- Add cancellation tracking to prevent abuse
-- After 3 consecutive cancellations, user cannot reserve for 30 minutes

-- Create cancellation tracking table
CREATE TABLE IF NOT EXISTS public.user_cancellation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate cancellations
  UNIQUE(reservation_id)
);

-- Add index for quick lookups
CREATE INDEX idx_cancellation_tracking_user_id_cancelled_at 
ON public.user_cancellation_tracking(user_id, cancelled_at DESC);

-- Add index for checking recent cancellations
CREATE INDEX idx_cancellation_tracking_user_created 
ON public.user_cancellation_tracking(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_cancellation_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own cancellation history
CREATE POLICY user_cancellation_tracking_select ON public.user_cancellation_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Only system can insert (via trigger)
CREATE POLICY user_cancellation_tracking_insert ON public.user_cancellation_tracking
  FOR INSERT
  WITH CHECK (TRUE);

-- Create function to get user's consecutive cancellation count
CREATE OR REPLACE FUNCTION get_user_consecutive_cancellations(p_user_id UUID)
RETURNS TABLE(
  cancellation_count INTEGER,
  oldest_cancellation_time TIMESTAMPTZ,
  time_until_unlock INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_oldest_time TIMESTAMPTZ;
  v_cooldown_until TIMESTAMPTZ;
BEGIN
  -- Get cancellation count in last 30 minutes
  SELECT COUNT(*), MIN(cancelled_at)
  INTO v_count, v_oldest_time
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND cancelled_at > NOW() - INTERVAL '30 minutes';

  -- Calculate when cooldown ends (30 minutes after oldest cancellation)
  IF v_oldest_time IS NOT NULL THEN
    v_cooldown_until := v_oldest_time + INTERVAL '30 minutes';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(v_count, 0)::INTEGER,
    v_oldest_time,
    GREATEST(v_cooldown_until - NOW(), INTERVAL '0')::INTERVAL;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_consecutive_cancellations TO authenticated;

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
