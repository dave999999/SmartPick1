-- Drop ALL versions of the problematic functions and recreate only the correct ones
-- This ensures no duplicates remain

-- Drop all versions (with any signature)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT p.oid::regprocedure AS func
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname IN (
            'purchase_reservation_slot',
            'apply_referral_code_with_rewards',
            'calculate_referral_suspicion_score',
            'admin_review_referral',
            'update_system_setting'
          )
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.func || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', r.func;
    END LOOP;
END $$;

-- Now recreate them with SET search_path = public

-- 1. purchase_reservation_slot
CREATE FUNCTION public.purchase_reservation_slot(
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

-- 2. apply_referral_code_with_rewards
CREATE FUNCTION public.apply_referral_code_with_rewards(
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

-- 3. calculate_referral_suspicion_score
CREATE FUNCTION public.calculate_referral_suspicion_score(p_user_id uuid)
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

-- 4. admin_review_referral
CREATE FUNCTION public.admin_review_referral(p_user_id uuid, p_approved boolean)
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

-- 5. update_system_setting
CREATE FUNCTION public.update_system_setting(p_key text, p_value text)
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

SELECT 'All duplicate functions removed and recreated with search_path=public' AS result;
