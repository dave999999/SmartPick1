-- ============================================================================
-- ROBUST FIX: Drop all versions then recreate
-- ============================================================================

-- Use DO block to drop all matching function versions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all versions of the 11 functions
    FOR r IN 
        SELECT p.oid::regprocedure as func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname IN (
            'reset_user_cooldown',
            'lift_cooldown_with_points',
            'get_user_daily_cancellation_count',
            'purchase_partner_offer_slot',
            'expire_user_reservations',
            'track_reservation_cancellation',
            'calculate_lift_points',
            'is_user_in_cooldown',
            'lift_penalty_with_points',
            'get_suspension_duration',
            'can_user_reserve'
          )
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.func_signature);
    END LOOP;
END $$;

-- Now create all the secure versions
-- ============================================================================
-- Function 1: can_user_reserve
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_user_reserve(p_user_id UUID)
RETURNS TABLE(can_reserve BOOLEAN, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_in_cooldown BOOLEAN;
  v_cooldown_end TIMESTAMPTZ;
BEGIN
  SELECT is_in_cooldown, cooldown_end_time
  INTO v_is_in_cooldown, v_cooldown_end
  FROM public.is_user_in_cooldown(p_user_id);

  IF v_is_in_cooldown THEN
    RETURN QUERY SELECT FALSE, 'User is in cooldown until ' || v_cooldown_end::TEXT;
  ELSE
    RETURN QUERY SELECT TRUE, 'User can make reservations'::TEXT;
  END IF;
END;
$$;

-- ============================================================================
-- Function 2: calculate_lift_points
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_lift_points(p_cancellation_count INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN CASE
    WHEN p_cancellation_count <= 3 THEN 0
    WHEN p_cancellation_count = 4 THEN 100
    WHEN p_cancellation_count = 5 THEN 200
    ELSE 300
  END;
END;
$$;

-- ============================================================================
-- Function 3: expire_user_reservations
-- ============================================================================
CREATE OR REPLACE FUNCTION public.expire_user_reservations(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.reservations
    SET status = 'EXPIRED',
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND status = 'PENDING'
      AND pickup_window_end < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired_count FROM expired;
  RETURN v_expired_count;
END;
$$;

-- ============================================================================
-- Function 4: get_suspension_duration
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_suspension_duration(p_cancellation_count INTEGER)
RETURNS INTERVAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN CASE
    WHEN p_cancellation_count <= 3 THEN INTERVAL '0 minutes'
    WHEN p_cancellation_count = 4 THEN INTERVAL '1 day'
    WHEN p_cancellation_count = 5 THEN INTERVAL '3 days'
    WHEN p_cancellation_count = 6 THEN INTERVAL '7 days'
    ELSE INTERVAL '30 days'
  END;
END;
$$;

-- ============================================================================
-- Function 5: get_user_daily_cancellation_count
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_daily_cancellation_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
  v_georgia_date DATE;
BEGIN
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  SELECT COUNT(*) INTO v_count
  FROM public.user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;
  RETURN COALESCE(v_count, 0);
END;
$$;

-- ============================================================================
-- Function 6: is_user_in_cooldown
-- ============================================================================
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
  
  IF v_cancel_count < 4 THEN
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

-- ============================================================================
-- Function 7: lift_cooldown_with_points
-- ============================================================================
CREATE OR REPLACE FUNCTION public.lift_cooldown_with_points(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, points_spent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cancel_count INTEGER;
  v_user_points INTEGER;
  v_points_cost INTEGER;
  v_georgia_date DATE;
BEGIN
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  SELECT COUNT(*) INTO v_cancel_count
  FROM public.user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;
  
  v_points_cost := public.calculate_lift_points(v_cancel_count);
  
  IF v_cancel_count < 4 THEN
    RETURN QUERY SELECT FALSE, 'არ გჭირდებათ შეზღუდვის მოხსნა'::TEXT, 0;
    RETURN;
  END IF;
  
  SELECT balance INTO v_user_points FROM public.user_points WHERE user_id = p_user_id;
  
  IF v_user_points IS NULL OR v_user_points < v_points_cost THEN
    RETURN QUERY SELECT FALSE, 'არასაკმარისი ბალანსი. საჭიროა ' || v_points_cost || ' ქულა.'::TEXT, 0;
    RETURN;
  END IF;
  
  UPDATE public.user_points
  SET balance = balance - v_points_cost, updated_at = NOW()
  WHERE user_id = p_user_id;
  
  INSERT INTO public.user_cooldown_lifts (user_id, cancellation_count_at_lift, lift_type, points_spent, lifted_at)
  VALUES (p_user_id, v_cancel_count, 'PAID', v_points_cost, NOW());
  
  RETURN QUERY SELECT TRUE, 'შეზღუდვა წარმატებით მოიხსნა'::TEXT, v_points_cost;
END;
$$;

-- ============================================================================
-- Function 8: lift_penalty_with_points
-- ============================================================================
CREATE OR REPLACE FUNCTION public.lift_penalty_with_points(
  p_user_id UUID,
  p_points_to_spend INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_points INTEGER;
  v_penalty_record RECORD;
BEGIN
  SELECT balance INTO v_user_points FROM public.user_points WHERE user_id = p_user_id;
  
  IF v_user_points IS NULL OR v_user_points < p_points_to_spend THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;
  
  SELECT * INTO v_penalty_record FROM public.user_penalties
  WHERE user_id = p_user_id AND status = 'ACTIVE' AND penalty_end > NOW()
  ORDER BY created_at DESC LIMIT 1;
  
  IF v_penalty_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active penalty found');
  END IF;
  
  UPDATE public.user_points
  SET balance = balance - p_points_to_spend, updated_at = NOW()
  WHERE user_id = p_user_id;
  
  UPDATE public.user_penalties
  SET status = 'LIFTED', lifted_at = NOW(), updated_at = NOW()
  WHERE id = v_penalty_record.id;
  
  RETURN jsonb_build_object('success', true, 'points_spent', p_points_to_spend);
END;
$$;

-- ============================================================================
-- Function 9: purchase_partner_offer_slot
-- ============================================================================
CREATE OR REPLACE FUNCTION public.purchase_partner_offer_slot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_id UUID;
  v_cost INTEGER := 500;
  v_partner_points INTEGER;
BEGIN
  v_partner_id := auth.uid();
  
  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE user_id = v_partner_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a partner');
  END IF;
  
  SELECT balance INTO v_partner_points FROM public.user_points WHERE user_id = v_partner_id;
  
  IF v_partner_points IS NULL OR v_partner_points < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points. Required: ' || v_cost);
  END IF;
  
  UPDATE public.user_points
  SET balance = balance - v_cost, updated_at = NOW()
  WHERE user_id = v_partner_id;
  
  UPDATE public.partners
  SET available_slots = available_slots + 1, updated_at = NOW()
  WHERE user_id = v_partner_id;
  
  RETURN jsonb_build_object('success', true, 'points_spent', v_cost, 'message', 'Slot purchased successfully');
END;
$$;

-- ============================================================================
-- Function 10: reset_user_cooldown
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_user_cooldown(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_has_active_cooldown BOOLEAN;
  v_georgia_date DATE;
BEGIN
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  SELECT COUNT(*) >= 4 INTO v_has_active_cooldown
  FROM public.user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;

  IF NOT v_has_active_cooldown THEN
    RETURN QUERY SELECT FALSE, 'No active cooldown to reset'::TEXT;
    RETURN;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.user_cooldown_lifts
    WHERE user_id = p_user_id AND lift_type = 'FREE'
      AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date
  ) THEN
    RETURN QUERY SELECT FALSE, 'Free reset already used today'::TEXT;
    RETURN;
  END IF;
  
  INSERT INTO public.user_cooldown_lifts (user_id, cancellation_count_at_lift, lift_type, points_spent, lifted_at)
  SELECT p_user_id, COUNT(*), 'FREE', 0, NOW()
  FROM public.user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;
  
  RETURN QUERY SELECT TRUE, 'Cooldown reset successfully'::TEXT;
END;
$$;

-- ============================================================================
-- Function 11: track_reservation_cancellation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.track_reservation_cancellation(p_user_id UUID, p_reservation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cancel_count INTEGER;
  v_georgia_date DATE;
BEGIN
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  INSERT INTO public.user_cancellation_tracking (user_id, reservation_id, cancelled_at)
  VALUES (p_user_id, p_reservation_id, NOW());
  
  SELECT COUNT(*) INTO v_cancel_count
  FROM public.user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;
  
  RETURN jsonb_build_object(
    'success', true,
    'cancellation_count', v_cancel_count,
    'is_in_cooldown', v_cancel_count >= 4
  );
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.can_user_reserve TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_lift_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_user_reservations TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_suspension_duration TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_daily_cancellation_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_in_cooldown TO authenticated;
GRANT EXECUTE ON FUNCTION public.lift_cooldown_with_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.lift_penalty_with_points TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_partner_offer_slot TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_cooldown TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_reservation_cancellation TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  p.proname as function_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    ) THEN '✅ FIXED'
    ELSE '❌ STILL VULNERABLE'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'reset_user_cooldown', 'lift_cooldown_with_points', 'get_user_daily_cancellation_count',
    'purchase_partner_offer_slot', 'expire_user_reservations', 'track_reservation_cancellation',
    'calculate_lift_points', 'is_user_in_cooldown', 'lift_penalty_with_points',
    'get_suspension_duration', 'can_user_reserve'
  )
ORDER BY p.proname;

-- Expected: All 11 should show '✅ FIXED'
