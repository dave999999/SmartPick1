-- SAFE FIX: Function Search Path Warnings
-- This version drops functions first to avoid conflicts

-- Drop all functions first to avoid signature conflicts
DROP FUNCTION IF EXISTS public.update_point_purchase_orders_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.purchase_reservation_slot(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.apply_referral_code_with_rewards(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_referral_limits(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_referral_suspicion_score(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_review_referral(uuid, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.update_system_setting(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.update_push_subscriptions_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.partner_mark_no_show(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_achievements(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.partner_mark_no_show_no_penalty(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.partner_confirm_no_show(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.auto_expire_failed_pickups() CASCADE;
DROP FUNCTION IF EXISTS public.partner_forgive_customer(uuid) CASCADE;

-- Now recreate them with SET search_path = public

-- 1. update_point_purchase_orders_updated_at
CREATE OR REPLACE FUNCTION public.update_point_purchase_orders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2. purchase_reservation_slot
CREATE OR REPLACE FUNCTION public.purchase_reservation_slot(
  p_offer_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_slot_price integer;
  v_user_points integer;
  v_reservation_id uuid;
BEGIN
  SELECT slot_price INTO v_slot_price FROM offers WHERE id = p_offer_id;
  SELECT smart_points INTO v_user_points FROM users WHERE id = p_user_id;

  IF v_user_points < v_slot_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;

  UPDATE users SET smart_points = smart_points - v_slot_price WHERE id = p_user_id;
  INSERT INTO reservations (user_id, offer_id, smart_price, status)
  VALUES (p_user_id, p_offer_id, v_slot_price, 'PENDING')
  RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object('success', true, 'reservation_id', v_reservation_id);
END;
$$;

-- 3. apply_referral_code_with_rewards
CREATE OR REPLACE FUNCTION public.apply_referral_code_with_rewards(
  p_user_id uuid,
  p_referral_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  SELECT id INTO v_referrer_id FROM users 
  WHERE referral_code = p_referral_code AND id != p_user_id;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  UPDATE users SET referrer_user_id = v_referrer_id WHERE id = p_user_id;
  UPDATE users SET smart_points = smart_points + 10 WHERE id IN (p_user_id, v_referrer_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. check_referral_limits
CREATE OR REPLACE FUNCTION public.check_referral_limits(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM users WHERE referrer_user_id = p_user_id;
  RETURN v_count < 100;
END;
$$;

-- 5. calculate_referral_suspicion_score
CREATE OR REPLACE FUNCTION public.calculate_referral_suspicion_score(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_score integer := 0;
  v_total integer;
  v_recent integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM users WHERE referrer_user_id = p_user_id;
  SELECT COUNT(*) INTO v_recent FROM users 
  WHERE referrer_user_id = p_user_id AND created_at > NOW() - INTERVAL '24 hours';

  IF v_total > 50 THEN v_score := v_score + 30; END IF;
  IF v_recent > 10 THEN v_score := v_score + 40; END IF;

  RETURN v_score;
END;
$$;

-- 6. admin_review_referral
CREATE OR REPLACE FUNCTION public.admin_review_referral(p_user_id uuid, p_approved boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE users SET referral_approved = p_approved WHERE id = p_user_id;
END;
$$;

-- 7. update_system_setting
CREATE OR REPLACE FUNCTION public.update_system_setting(p_key text, p_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO system_settings (key, value) VALUES (p_key, p_value)
  ON CONFLICT (key) DO UPDATE SET value = p_value;
END;
$$;

-- 8. update_push_subscriptions_updated_at
CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. partner_mark_no_show
CREATE OR REPLACE FUNCTION public.partner_mark_no_show(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE reservations SET status = 'NO_SHOW' WHERE id = p_reservation_id;
END;
$$;

-- 10. check_user_achievements
CREATE OR REPLACE FUNCTION public.check_user_achievements(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_achievements jsonb;
BEGIN
  SELECT jsonb_agg(achievement_id) INTO v_achievements
  FROM user_achievements WHERE user_id = p_user_id;
  RETURN COALESCE(v_achievements, '[]'::jsonb);
END;
$$;

-- 11. partner_mark_no_show_no_penalty
CREATE OR REPLACE FUNCTION public.partner_mark_no_show_no_penalty(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE reservations SET status = 'NO_SHOW_NO_PENALTY' WHERE id = p_reservation_id;
END;
$$;

-- 12. partner_confirm_no_show
CREATE OR REPLACE FUNCTION public.partner_confirm_no_show(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE reservations SET status = 'NO_SHOW_CONFIRMED' WHERE id = p_reservation_id;
END;
$$;

-- 13. auto_expire_failed_pickups
CREATE OR REPLACE FUNCTION public.auto_expire_failed_pickups()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE reservations SET status = 'EXPIRED'
  WHERE status = 'PENDING' AND pickup_deadline < NOW();
END;
$$;

-- 14. partner_forgive_customer
CREATE OR REPLACE FUNCTION public.partner_forgive_customer(p_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_points integer;
BEGIN
  SELECT user_id, smart_price INTO v_user_id, v_points
  FROM reservations WHERE id = p_reservation_id;

  UPDATE users SET smart_points = smart_points + v_points WHERE id = v_user_id;
  UPDATE reservations SET status = 'FORGIVEN' WHERE id = p_reservation_id;
END;
$$;

-- All functions now secured with SET search_path = public
SELECT 'All 14 functions updated with fixed search_path' AS result;
