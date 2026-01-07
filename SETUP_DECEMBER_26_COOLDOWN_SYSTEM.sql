-- ========================================
-- COMPLETE DECEMBER 26 COOLDOWN SYSTEM SETUP
-- ========================================
-- This recreates the entire cancellation cooldown system from December 26, 2025
-- Run this in Supabase SQL Editor

-- ========================================
-- 1. CREATE TABLES
-- ========================================

-- Main cancellation tracking table
CREATE TABLE IF NOT EXISTS public.user_cancellation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  cancelled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reset_cooldown_used BOOLEAN DEFAULT FALSE,
  cooldown_duration_minutes INTEGER DEFAULT 30,
  reset_count INTEGER DEFAULT 0,
  
  UNIQUE(reservation_id)
);

-- Cooldown lifts tracking table
CREATE TABLE IF NOT EXISTS public.user_cooldown_lifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lifted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancellation_count_at_lift INTEGER NOT NULL,
  lift_type TEXT NOT NULL, -- 'free' or 'paid'
  points_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- 2. CREATE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_user_id_cancelled_at 
ON public.user_cancellation_tracking(user_id, cancelled_at DESC);

CREATE INDEX IF NOT EXISTS idx_cancellation_tracking_user_created 
ON public.user_cancellation_tracking(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cooldown_lifts_user_lifted     
ON user_cooldown_lifts(user_id, lifted_at DESC);

-- ========================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.user_cancellation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cooldown_lifts ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. CREATE RLS POLICIES
-- ========================================

-- Drop existing policies
DROP POLICY IF EXISTS user_cancellation_tracking_select ON public.user_cancellation_tracking;
DROP POLICY IF EXISTS user_cancellation_tracking_insert ON public.user_cancellation_tracking;
DROP POLICY IF EXISTS user_cooldown_lifts_select ON public.user_cooldown_lifts;
DROP POLICY IF EXISTS user_cooldown_lifts_insert ON public.user_cooldown_lifts;

-- Cancellation tracking policies
CREATE POLICY user_cancellation_tracking_select ON public.user_cancellation_tracking
  FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY user_cancellation_tracking_insert ON public.user_cancellation_tracking
  FOR INSERT
  WITH CHECK (TRUE);

-- Cooldown lifts policies
CREATE POLICY user_cooldown_lifts_select ON public.user_cooldown_lifts
  FOR SELECT 
  USING ((select auth.uid()) = user_id);

CREATE POLICY user_cooldown_lifts_insert ON public.user_cooldown_lifts
  FOR INSERT 
  WITH CHECK ((select auth.uid()) = user_id);

-- ========================================
-- 5. CREATE TRIGGER FUNCTION TO TRACK CANCELLATIONS
-- ========================================

CREATE OR REPLACE FUNCTION track_reservation_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only track if status changed to CANCELLED
  IF NEW.status = 'CANCELLED' AND (OLD.status IS NULL OR OLD.status != 'CANCELLED') THEN
    -- Insert into cancellation tracking
    INSERT INTO user_cancellation_tracking (user_id, reservation_id, cancelled_at)
    VALUES (NEW.customer_id, NEW.id, NOW())
    ON CONFLICT (reservation_id) DO NOTHING;

    RAISE NOTICE 'Cancellation tracked for user % reservation %', NEW.customer_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_track_cancellation ON public.reservations;

CREATE TRIGGER trg_track_cancellation
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION track_reservation_cancellation();

-- ========================================
-- 6. CREATE is_user_in_cooldown FUNCTION
-- ========================================

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
SET search_path = public
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

GRANT EXECUTE ON FUNCTION is_user_in_cooldown TO authenticated;

-- ========================================
-- 7. CREATE get_user_daily_cancellation_count FUNCTION
-- ========================================

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
SET search_path = public
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

GRANT EXECUTE ON FUNCTION get_user_daily_cancellation_count TO authenticated;

-- ========================================
-- 8. CREATE reset_user_cooldown FUNCTION (FREE lift)
-- ========================================

DROP FUNCTION IF EXISTS reset_user_cooldown(UUID);

CREATE OR REPLACE FUNCTION reset_user_cooldown(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancel_count INTEGER;
  v_reset_count INTEGER;
  v_georgia_date DATE;
BEGIN
  -- Get current date in Georgia timezone
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

  -- Get current cancellation and reset count for today
  SELECT
    COUNT(*),
    MAX(COALESCE(reset_count, 0))
  INTO v_cancel_count, v_reset_count
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;

  -- Must have 3+ cancellations to need reset
  IF v_cancel_count < 3 THEN
    RETURN QUERY SELECT FALSE, 'No active cooldown to reset'::TEXT;
    RETURN;
  END IF;

  -- Check if this is first time (free reset)
  IF v_reset_count = 0 THEN
    -- Update reset_count for today's cancellations
    UPDATE user_cancellation_tracking
    SET reset_count = 1
    WHERE user_id = p_user_id
      AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;

    -- Record that user lifted cooldown (FREE - first time)
    INSERT INTO user_cooldown_lifts (user_id, cancellation_count_at_lift, lift_type, points_spent)
    VALUES (p_user_id, v_cancel_count, 'free', 0);

    RETURN QUERY SELECT TRUE, 'Cooldown lifted! You can now make a reservation. Be careful with cancellations!'::TEXT;
    RETURN;
  END IF;

  -- If already used free reset, they need to pay points (handled by different function)
  RETURN QUERY SELECT FALSE, 'You already used your free reset. Use paid lift option.'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_user_cooldown TO authenticated;

-- ========================================
-- 9. CREATE lift_cooldown_with_points FUNCTION (PAID lift)
-- ========================================

DROP FUNCTION IF EXISTS lift_cooldown_with_points(UUID, INTEGER);
DROP FUNCTION IF EXISTS lift_cooldown_with_points(UUID);

CREATE OR REPLACE FUNCTION lift_cooldown_with_points(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, points_spent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancel_count INTEGER;
  v_user_points INTEGER;
  v_points_cost INTEGER := 100; -- Fixed cost for 4th cancellation
  v_georgia_date DATE;
BEGIN
  -- Get current date in Georgia timezone
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

  -- Get current cancellation count for today (Georgia time)
  SELECT COUNT(*)
  INTO v_cancel_count
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;

  -- Must have 4 cancellations to use paid lift
  IF v_cancel_count < 4 THEN
    RETURN QUERY SELECT FALSE, 'არ გჭირდებათ შეზღუდვის მოხსნა'::TEXT, 0;
    RETURN;
  END IF;

  -- Get user's current points balance from user_points table
  SELECT balance INTO v_user_points
  FROM user_points
  WHERE user_id = p_user_id;

  -- Check if user has enough points
  IF v_user_points IS NULL OR v_user_points < v_points_cost THEN
    RETURN QUERY SELECT FALSE, 'არასაკმარისი ბალანსი. საჭიროა 100 ქულა.'::TEXT, 0;
    RETURN;
  END IF;

  -- Deduct points from user
  UPDATE user_points
  SET balance = balance - v_points_cost
  WHERE user_id = p_user_id;

  -- Record the paid cooldown lift
  INSERT INTO user_cooldown_lifts (user_id, cancellation_count_at_lift, lift_type, points_spent)
  VALUES (p_user_id, v_cancel_count, 'paid', v_points_cost);

  RETURN QUERY SELECT TRUE, 'შეზღუდვა წარმატებით მოიხსნა! დახარჯული 100 ქულა.'::TEXT, v_points_cost;
END;
$$;

GRANT EXECUTE ON FUNCTION lift_cooldown_with_points TO authenticated;

-- ========================================
-- 10. VERIFICATION QUERIES
-- ========================================

-- Check tables exist
SELECT 'Tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_cancellation_tracking', 'user_cooldown_lifts');

-- Check functions exist
SELECT 'Functions created:' as status;
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_user_in_cooldown', 'get_user_daily_cancellation_count', 
                       'reset_user_cooldown', 'lift_cooldown_with_points',
                       'track_reservation_cancellation');

-- Check trigger exists
SELECT 'Trigger status:' as status;
SELECT tgname as trigger_name, tgrelid::regclass as table_name, tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trg_track_cancellation';

-- ========================================
-- SUCCESS!
-- ========================================
-- The December 26 cooldown system is now fully installed.
-- 
-- System Overview:
-- - Count = 3: FREE cooldown lift (1 hour cooldown)
-- - Count = 4: PAID cooldown lift (100 points, 1 hour cooldown)
-- - Count >= 5: BLOCKED until midnight Georgia time (no lift option)
-- 
-- Timezone: Asia/Tbilisi (Georgia, UTC+4)
-- Daily reset: Midnight Georgia time
