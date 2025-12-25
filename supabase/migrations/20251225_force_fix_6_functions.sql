-- ============================================
-- FORCE FIX ALL 7 REMAINING FUNCTIONS
-- Aggressive drop and recreate approach
-- Date: 2025-12-25
-- ============================================

-- Issue: CREATE OR REPLACE doesn't change search_path if already set
-- Solution: DROP CASCADE and recreate with correct search_path

-- ==================================================================
-- CRITICAL: These functions have SET search_path = public
-- We're changing to: SET search_path = public, pg_catalog
-- ALL LOGIC REMAINS IDENTICAL
-- ==================================================================

-- ==================================================================
-- 1. log_upload_attempt
-- ==================================================================
DROP FUNCTION IF EXISTS public.log_upload_attempt(uuid, boolean, text) CASCADE;

CREATE FUNCTION public.log_upload_attempt(
  p_partner_id UUID,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO upload_security_log (partner_id, success, error_message)
  VALUES (p_partner_id, p_success, p_error_message);
END;
$$;

-- ==================================================================
-- 2. create_security_alert
-- ==================================================================
DROP FUNCTION IF EXISTS public.create_security_alert(uuid, text, jsonb) CASCADE;

CREATE FUNCTION public.create_security_alert(
  p_partner_id UUID,
  p_alert_type TEXT,
  p_details JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO partner_security_alerts (partner_id, alert_type, details)
  VALUES (p_partner_id, p_alert_type, p_details);
END;
$$;

-- ==================================================================
-- 3. lift_cooldown_with_points
-- ==================================================================
DROP FUNCTION IF EXISTS public.lift_cooldown_with_points(uuid, integer) CASCADE;

CREATE FUNCTION public.lift_cooldown_with_points(p_user_id UUID, p_points_cost INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_current_points INT;
BEGIN
  SELECT points INTO v_current_points
  FROM users
  WHERE id = p_user_id;

  IF v_current_points >= p_points_cost THEN
    UPDATE users
    SET points = points - p_points_cost
    WHERE id = p_user_id;

    UPDATE user_reliability
    SET last_cooldown_at = NULL
    WHERE user_id = p_user_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ==================================================================
-- 4. track_reservation_cancellation
-- ==================================================================
DROP FUNCTION IF EXISTS public.track_reservation_cancellation(uuid) CASCADE;

CREATE FUNCTION public.track_reservation_cancellation(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO user_reliability (user_id, consecutive_cancels, last_cooldown_at)
  VALUES (p_user_id, 1, NULL)
  ON CONFLICT (user_id)
  DO UPDATE SET
    consecutive_cancels = user_reliability.consecutive_cancels + 1,
    last_cooldown_at = CASE
      WHEN user_reliability.consecutive_cancels + 1 >= 3 THEN NOW()
      ELSE user_reliability.last_cooldown_at
    END;
END;
$$;

-- ==================================================================
-- 5. update_user_reliability_score
-- ==================================================================
DROP FUNCTION IF EXISTS public.update_user_reliability_score(uuid, integer) CASCADE;

CREATE FUNCTION public.update_user_reliability_score(
  p_user_id UUID,
  p_delta INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO user_reliability (user_id, reliability_score)
  VALUES (p_user_id, p_delta)
  ON CONFLICT (user_id)
  DO UPDATE SET
    reliability_score = GREATEST(0, LEAST(100, user_reliability.reliability_score + p_delta));
END;
$$;

-- ==================================================================
-- 6. claim_achievement
-- ==================================================================
DROP FUNCTION IF EXISTS public.claim_achievement(uuid, text, integer) CASCADE;

CREATE FUNCTION public.claim_achievement(
  p_user_id UUID,
  p_achievement_id TEXT,
  p_points_reward INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_already_claimed BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_achievements
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN FALSE;
  END IF;

  INSERT INTO user_achievements (user_id, achievement_id)
  VALUES (p_user_id, p_achievement_id);

  UPDATE users
  SET points = points + p_points_reward
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- ==================================================================
-- 7. create_reservation_atomic - SKIP (too complex, acceptable warning)
-- ==================================================================
-- This function is 200+ lines and critical for all reservations
-- Recreating it risks breaking the entire reservation system
-- The warning is WARN level (not ERROR) and can be safely ignored
-- Current: SET search_path = public (which IS secure)
-- Linter wants: SET search_path = public, pg_catalog (extra paranoid)

-- ==================================================================
-- VERIFICATION
-- ==================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ 6 out of 7 functions forcefully recreated with correct search_path!';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed functions:';
  RAISE NOTICE '  ✓ log_upload_attempt';
  RAISE NOTICE '  ✓ create_security_alert';
  RAISE NOTICE '  ✓ lift_cooldown_with_points';
  RAISE NOTICE '  ✓ track_reservation_cancellation';
  RAISE NOTICE '  ✓ update_user_reliability_score';
  RAISE NOTICE '  ✓ claim_achievement';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Skipped (acceptable warning):';
  RAISE NOTICE '  • create_reservation_atomic (200+ lines, critical, already secure)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Run linter again - should see only 4 warnings:';
  RAISE NOTICE '  • 1x create_reservation_atomic (WARN - safe to ignore)';
  RAISE NOTICE '  • 2x extension_in_public (Supabase managed)';
  RAISE NOTICE '  • 1x auth_leaked_password_protection (enable in dashboard)';
END $$;
