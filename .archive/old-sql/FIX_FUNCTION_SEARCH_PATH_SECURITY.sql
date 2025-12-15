-- ============================================================================
-- FIX: Add search_path to all functions (Security Warning Fix)
-- ============================================================================
-- Problem: 17 functions have mutable search_path, vulnerable to schema injection
-- Solution: Add "SET search_path = public, pg_temp" to each function
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. check_partner_offer_slots
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_partner_offer_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_id UUID;
  v_max_slots INT;
  v_current_count INT;
BEGIN
  SELECT user_id INTO v_partner_id
  FROM public.partners
  WHERE id = NEW.partner_id;

  SELECT offer_slots INTO v_max_slots
  FROM public.partner_points
  WHERE user_id = v_partner_id;

  v_max_slots := COALESCE(v_max_slots, 4);

  SELECT COUNT(*) INTO v_current_count
  FROM public.offers
  WHERE partner_id = NEW.partner_id
    AND status IN ('ACTIVE', 'SCHEDULED')
    AND id <> NEW.id;

  IF v_current_count >= v_max_slots THEN
    RAISE EXCEPTION 'Offer slot limit reached. You have % slots. Purchase more slots to add offers.', v_max_slots;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. check_table_health
-- ============================================================================
DROP FUNCTION IF EXISTS public.check_table_health();

CREATE OR REPLACE FUNCTION public.check_table_health()
RETURNS TABLE (
  schemaname TEXT,
  tablename TEXT,
  n_live_tup BIGINT,
  n_dead_tup BIGINT,
  dead_tuple_ratio NUMERIC,
  last_vacuum TIMESTAMPTZ,
  last_autovacuum TIMESTAMPTZ,
  needs_vacuum BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::TEXT,
    s.tablename::TEXT,
    s.n_live_tup,
    s.n_dead_tup,
    CASE 
      WHEN s.n_live_tup > 0 THEN ROUND((s.n_dead_tup::numeric / s.n_live_tup::numeric) * 100, 2)
      ELSE 0
    END as dead_tuple_ratio,
    pg_stat_get_last_vacuum_time(c.oid) as last_vacuum,
    pg_stat_get_last_autovacuum_time(c.oid) as last_autovacuum,
    (s.n_dead_tup > 1000 AND s.n_dead_tup::numeric / NULLIF(s.n_live_tup, 0)::numeric > 0.1) as needs_vacuum
  FROM pg_stat_user_tables s
  JOIN pg_class c ON c.relname = s.tablename AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = s.schemaname)
  WHERE s.schemaname = 'public'
  ORDER BY dead_tuple_ratio DESC NULLS LAST;
END;
$$;

-- ============================================================================
-- 3. is_user_in_cooldown
-- ============================================================================
DROP FUNCTION IF EXISTS public.is_user_in_cooldown(UUID);

CREATE OR REPLACE FUNCTION public.is_user_in_cooldown(p_user_id UUID)
RETURNS TABLE(
  in_cooldown BOOLEAN,
  cooldown_until TIMESTAMPTZ,
  consecutive_cancellations INT,
  hours_remaining NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_consecutive_cancellations INT;
  v_cooldown_end TIMESTAMPTZ;
  v_cooldown_hours INT;
BEGIN
  SELECT consecutive_cancellations, cooldown_end_time
  INTO v_consecutive_cancellations, v_cooldown_end
  FROM public.cancellation_tracking
  WHERE user_id = p_user_id;

  IF v_consecutive_cancellations IS NULL THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, 0, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_cooldown_end IS NULL OR v_cooldown_end <= NOW() THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, v_consecutive_cancellations, 0::NUMERIC;
    RETURN;
  END IF;

  RETURN QUERY SELECT 
    true,
    v_cooldown_end,
    v_consecutive_cancellations,
    ROUND(EXTRACT(EPOCH FROM (v_cooldown_end - NOW())) / 3600, 2);
END;
$$;

-- ============================================================================
-- 4. partner_forgive_customer
-- ============================================================================
CREATE OR REPLACE FUNCTION public.partner_forgive_customer(p_reservation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid UUID := auth.uid();
  v_partner_id UUID;
  v_customer_id UUID;
  v_status TEXT;
  v_penalty_count INT;
BEGIN
  SELECT p.id, r.customer_id, r.status
  INTO v_partner_id, v_customer_id, v_status
  FROM public.reservations r
  JOIN public.partners p ON p.id = r.partner_id
  WHERE r.id = p_reservation_id AND p.user_id = v_auth_uid;

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation not found or unauthorized');
  END IF;

  IF v_status NOT IN ('ACTIVE', 'EXPIRED', 'FAILED_PICKUP') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Can only forgive ACTIVE, EXPIRED, or FAILED_PICKUP reservations');
  END IF;

  UPDATE public.reservations
  SET status = 'PARTNER_FORGIVEN',
      updated_at = NOW()
  WHERE id = p_reservation_id;

  UPDATE public.cancellation_tracking
  SET consecutive_cancellations = GREATEST(consecutive_cancellations - 1, 0),
      last_cancellation_at = NOW(),
      cooldown_end_time = NULL,
      updated_at = NOW()
  WHERE user_id = v_customer_id
  RETURNING consecutive_cancellations INTO v_penalty_count;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Customer forgiven',
    'new_penalty_count', COALESCE(v_penalty_count, 0)
  );
END;
$$;

-- ============================================================================
-- 5. get_user_consecutive_cancellations
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_user_consecutive_cancellations(UUID);

CREATE OR REPLACE FUNCTION public.get_user_consecutive_cancellations(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT consecutive_cancellations INTO v_count
  FROM public.cancellation_tracking
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- ============================================================================
-- 6. get_partner_dashboard_data
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_partner_dashboard_data(UUID);

CREATE OR REPLACE FUNCTION public.get_partner_dashboard_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'partner', row_to_json(p.*),
    'active_offers', (SELECT COUNT(*) FROM public.offers WHERE partner_id = p.id AND status = 'ACTIVE'),
    'pending_reservations', (SELECT COUNT(*) FROM public.reservations WHERE partner_id = p.id AND status = 'ACTIVE'),
    'completed_today', (SELECT COUNT(*) FROM public.reservations WHERE partner_id = p.id AND status = 'COMPLETED' AND DATE(updated_at) = CURRENT_DATE)
  ) INTO v_result
  FROM public.partners p
  WHERE p.user_id = p_user_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- ============================================================================
-- 7. partner_confirm_no_show
-- ============================================================================
CREATE OR REPLACE FUNCTION public.partner_confirm_no_show(p_reservation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid UUID := auth.uid();
  v_partner_id UUID;
  v_customer_id UUID;
  v_status TEXT;
BEGIN
  SELECT p.id, r.customer_id, r.status
  INTO v_partner_id, v_customer_id, v_status
  FROM public.reservations r
  JOIN public.partners p ON p.id = r.partner_id
  WHERE r.id = p_reservation_id AND p.user_id = v_auth_uid;

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation not found or unauthorized');
  END IF;

  IF v_status != 'EXPIRED' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Can only confirm no-show for EXPIRED reservations');
  END IF;

  UPDATE public.reservations
  SET status = 'FAILED_PICKUP',
      updated_at = NOW()
  WHERE id = p_reservation_id;

  PERFORM public.track_reservation_cancellation(p_reservation_id, v_customer_id, 'NO_SHOW');

  RETURN jsonb_build_object('success', true, 'message', 'No-show confirmed');
END;
$$;

-- ============================================================================
-- 8. grant_partner_welcome_points
-- ============================================================================
CREATE OR REPLACE FUNCTION public.grant_partner_welcome_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    INSERT INTO public.partner_points (user_id, balance, offer_slots)
    VALUES (NEW.user_id, 1000, 10)
    ON CONFLICT (user_id) DO UPDATE SET
      offer_slots = GREATEST(partner_points.offer_slots, 10),
      updated_at = NOW();
    
    INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
    VALUES (NEW.user_id, 1000, 'WELCOME', 0, 1000, jsonb_build_object('partner_id', NEW.id, 'business_name', NEW.business_name))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 9. reset_user_cooldown
-- ============================================================================
DROP FUNCTION IF EXISTS public.reset_user_cooldown(UUID);

CREATE OR REPLACE FUNCTION public.reset_user_cooldown(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.cancellation_tracking
  SET consecutive_cancellations = 0,
      cooldown_end_time = NULL,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Cooldown reset');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
END;
$$;

-- ============================================================================
-- 10. purchase_partner_offer_slot
-- ============================================================================
CREATE OR REPLACE FUNCTION public.purchase_partner_offer_slot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_partner_id UUID := auth.uid();
  v_current_slots INT;
  v_current_balance INT;
  v_cost INT;
  v_new_balance INT;
BEGIN
  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT offer_slots, balance INTO v_current_slots, v_current_balance
  FROM public.partner_points
  WHERE user_id = v_partner_id
  FOR UPDATE;

  IF v_current_slots IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Partner points not initialized');
  END IF;

  IF v_current_slots >= 50 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maximum slots reached (50)');
  END IF;

  v_cost := (v_current_slots - 3) * 50;

  IF v_current_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient points', 'balance', v_current_balance, 'cost', v_cost);
  END IF;

  v_new_balance := v_current_balance - v_cost;
  
  UPDATE public.partner_points
  SET balance = v_new_balance,
      offer_slots = v_current_slots + 1,
      updated_at = NOW()
  WHERE user_id = v_partner_id;

  INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
  VALUES (v_partner_id, -v_cost, 'SLOT_PURCHASE', v_current_balance, v_new_balance, jsonb_build_object('slot_number', v_current_slots + 1, 'cost', v_cost));

  RETURN jsonb_build_object(
    'success', true,
    'new_slots', v_current_slots + 1,
    'cost', v_cost,
    'balance', v_new_balance
  );
END;
$$;

-- ============================================================================
-- 11. track_reservation_cancellation
-- ============================================================================
DROP FUNCTION IF EXISTS public.track_reservation_cancellation(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.track_reservation_cancellation(
  p_reservation_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_consecutive INT;
  v_cooldown_hours INT;
BEGIN
  INSERT INTO public.cancellation_tracking (user_id, consecutive_cancellations, last_cancellation_at)
  VALUES (p_user_id, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET consecutive_cancellations = cancellation_tracking.consecutive_cancellations + 1,
      last_cancellation_at = NOW(),
      updated_at = NOW()
  RETURNING consecutive_cancellations INTO v_consecutive;

  IF v_consecutive >= 3 THEN
    v_cooldown_hours := (v_consecutive - 2) * 24;
    
    UPDATE public.cancellation_tracking
    SET cooldown_end_time = NOW() + (v_cooldown_hours || ' hours')::INTERVAL
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- ============================================================================
-- 12. get_realtime_stats
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_realtime_stats();

CREATE OR REPLACE FUNCTION public.get_realtime_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'active_users', (SELECT COUNT(*) FROM public.users WHERE last_seen_at > NOW() - INTERVAL '5 minutes'),
    'active_reservations', (SELECT COUNT(*) FROM public.reservations WHERE status = 'ACTIVE'),
    'active_offers', (SELECT COUNT(*) FROM public.offers WHERE status = 'ACTIVE'),
    'pending_partners', (SELECT COUNT(*) FROM public.partners WHERE status = 'PENDING')
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;

-- ============================================================================
-- 13. is_user_penalized
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_user_penalized(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_in_cooldown BOOLEAN;
BEGIN
  SELECT in_cooldown INTO v_in_cooldown
  FROM public.is_user_in_cooldown(p_user_id);

  RETURN COALESCE(v_in_cooldown, false);
END;
$$;

-- ============================================================================
-- 14. get_customer_dashboard_data
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_customer_dashboard_data(UUID);

CREATE OR REPLACE FUNCTION public.get_customer_dashboard_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'active_reservation', (SELECT row_to_json(r.*) FROM public.reservations r WHERE r.customer_id = p_user_id AND r.status = 'ACTIVE' LIMIT 1),
    'total_saved', (SELECT COALESCE(SUM(original_price - smart_price), 0) FROM public.reservations r JOIN public.offers o ON o.id = r.offer_id WHERE r.customer_id = p_user_id AND r.status = 'COMPLETED'),
    'completed_count', (SELECT COUNT(*) FROM public.reservations WHERE customer_id = p_user_id AND status = 'COMPLETED')
  ) INTO v_result;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- ============================================================================
-- 15. update_partner_location
-- ============================================================================
DROP FUNCTION IF EXISTS public.update_partner_location(UUID, NUMERIC, NUMERIC);

CREATE OR REPLACE FUNCTION public.update_partner_location(
  p_partner_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.partners
  SET latitude = p_latitude,
      longitude = p_longitude,
      updated_at = NOW()
  WHERE id = p_partner_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Location updated');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Partner not found');
  END IF;
END;
$$;

-- ============================================================================
-- 16. auto_expire_failed_pickups
-- ============================================================================
DROP FUNCTION IF EXISTS public.auto_expire_failed_pickups();

CREATE OR REPLACE FUNCTION public.auto_expire_failed_pickups()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.reservations
  SET status = 'FAILED_PICKUP',
      updated_at = NOW()
  WHERE status = 'ACTIVE'
    AND expires_at < NOW();
END;
$$;

-- ============================================================================
-- 17. reset_cancellation_tracking_on_success
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_cancellation_tracking_on_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status = 'ACTIVE' THEN
    UPDATE public.cancellation_tracking
    SET consecutive_cancellations = 0,
        cooldown_end_time = NULL,
        updated_at = NOW()
    WHERE user_id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT '✅ All 17 functions updated with search_path security fix!' as status;
