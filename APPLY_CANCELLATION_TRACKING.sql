-- Apply cancellation tracking system to prevent abuse
-- Run this in Supabase SQL Editor

-- Create cancellation tracking table
CREATE TABLE IF NOT EXISTS public.user_cancellation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reset_cooldown_used BOOLEAN DEFAULT FALSE,
  cooldown_duration_minutes INTEGER DEFAULT 30,
  
  UNIQUE(reservation_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_user_id_cancelled_at 
ON public.user_cancellation_tracking(user_id, cancelled_at DESC);

CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_user_created 
ON public.user_cancellation_tracking(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_cancellation_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS user_cancellation_tracking_select ON public.user_cancellation_tracking;
DROP POLICY IF EXISTS user_cancellation_tracking_insert ON public.user_cancellation_tracking;

CREATE POLICY user_cancellation_tracking_select ON public.user_cancellation_tracking
  FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY user_cancellation_tracking_insert ON public.user_cancellation_tracking
  FOR INSERT
  WITH CHECK (TRUE);

-- Create function to get user's consecutive cancellation count
DROP FUNCTION IF EXISTS get_user_consecutive_cancellations(uuid);

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
SET search_path = public
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
    COUNT(*),
    MIN(u.cancelled_at),
    MAX(CASE WHEN u.reset_cooldown_used THEN 1 ELSE 0 END)::BOOLEAN,
    MAX(u.cooldown_duration_minutes)
  INTO v_count, v_oldest_time, v_reset_used, v_cooldown_duration
  FROM user_cancellation_tracking u
  WHERE u.user_id = p_user_id
    AND u.cancelled_at > NOW() - INTERVAL '45 minutes';

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

GRANT EXECUTE ON FUNCTION get_user_consecutive_cancellations TO authenticated;

-- Create trigger function to track cancellations
CREATE OR REPLACE FUNCTION track_reservation_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only track when status changes to CANCELLED
  IF OLD.status != 'CANCELLED' AND NEW.status = 'CANCELLED' THEN
    INSERT INTO user_cancellation_tracking (user_id, reservation_id, cancelled_at)
    VALUES (NEW.customer_id, NEW.id, NOW())
    ON CONFLICT (reservation_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on reservations table
DROP TRIGGER IF EXISTS track_cancellation_trigger ON public.reservations;

CREATE TRIGGER track_cancellation_trigger
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION track_reservation_cancellation();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Cancellation tracking system installed successfully';
END $$;
