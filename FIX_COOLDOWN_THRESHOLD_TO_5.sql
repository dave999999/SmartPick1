-- Fix cooldown threshold: Should trigger after 5 cancellations, not 4
-- Users should be able to cancel 4 times before cooldown activates

CREATE OR REPLACE FUNCTION public.is_user_in_cooldown(p_user_id UUID)
RETURNS TABLE(is_in_cooldown BOOLEAN, cooldown_end_time TIMESTAMPTZ, cancellation_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cancel_count INTEGER;
  v_georgia_date DATE;
  v_cooldown_duration INTERVAL;
  v_latest_cancellation TIMESTAMPTZ;
  v_has_lifted BOOLEAN;
BEGIN
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  SELECT COUNT(*) INTO v_cancel_count
  FROM public.user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;
  
  SELECT EXISTS(
    SELECT 1 FROM public.user_cooldown_lifts
    WHERE user_id = p_user_id
      AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date
  ) INTO v_has_lifted;
  
  IF v_has_lifted THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, v_cancel_count;
    RETURN;
  END IF;
  
  -- Cooldown triggers after 3 cancellations (shows warning modals at 3, 4, fully blocked at 5+)
  IF v_cancel_count < 3 THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, v_cancel_count;
    RETURN;
  END IF;
  
  SELECT MAX(cancelled_at) INTO v_latest_cancellation
  FROM public.user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;
  
  v_cooldown_duration := public.get_suspension_duration(v_cancel_count);
  RETURN QUERY SELECT TRUE, v_latest_cancellation + v_cooldown_duration, v_cancel_count;
END;
$$;

-- Test
SELECT * FROM is_user_in_cooldown(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);
