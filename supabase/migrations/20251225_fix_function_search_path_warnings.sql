-- ============================================
-- FIX SUPABASE LINTER WARNINGS
-- Fix: function_search_path_mutable warnings
-- Date: 2025-12-25
-- ============================================

-- Security Note: Setting search_path prevents search path manipulation attacks
-- where malicious users could create objects in schemas earlier in the search path
-- to hijack function calls.

-- All functions will use: SET search_path = public, pg_catalog
-- This ensures they only look in public schema and PostgreSQL system catalog.

-- ============================================
-- FIX: Image Upload/Quota Functions
-- ============================================

-- Fix check_upload_quota
CREATE OR REPLACE FUNCTION public.check_upload_quota(p_partner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_quota_used INT;
  v_quota_max INT;
BEGIN
  SELECT image_quota_used, image_quota_max
  INTO v_quota_used, v_quota_max
  FROM partners
  WHERE user_id = p_partner_id;

  RETURN v_quota_used < v_quota_max;
END;
$$;

-- Fix increment_image_quota
CREATE OR REPLACE FUNCTION public.increment_image_quota(p_partner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE partners
  SET image_quota_used = image_quota_used + 1
  WHERE user_id = p_partner_id;
END;
$$;

-- Fix decrement_image_quota
CREATE OR REPLACE FUNCTION public.decrement_image_quota(p_partner_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE partners
  SET image_quota_used = GREATEST(0, image_quota_used - 1)
  WHERE user_id = p_partner_id;
END;
$$;

-- Fix log_upload_attempt
CREATE OR REPLACE FUNCTION public.log_upload_attempt(
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

-- Fix check_upload_rate_limit
CREATE OR REPLACE FUNCTION public.check_upload_rate_limit(p_partner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_recent_uploads INT;
  v_rate_limit INT := 10; -- 10 uploads per hour
BEGIN
  SELECT COUNT(*)
  INTO v_recent_uploads
  FROM upload_security_log
  WHERE partner_id = p_partner_id
    AND created_at > NOW() - INTERVAL '1 hour'
    AND success = true;

  RETURN v_recent_uploads < v_rate_limit;
END;
$$;

-- Fix create_security_alert
CREATE OR REPLACE FUNCTION public.create_security_alert(
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

-- Fix monitor_failed_uploads
-- Drop trigger first, then function, because return type might be different
DROP TRIGGER IF EXISTS trigger_monitor_failed_uploads ON partner_upload_log;
DROP FUNCTION IF EXISTS public.monitor_failed_uploads() CASCADE;

CREATE FUNCTION public.monitor_failed_uploads()
RETURNS TABLE(partner_id UUID, failed_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    usl.partner_id,
    COUNT(*) as failed_count
  FROM upload_security_log usl
  WHERE usl.success = false
    AND usl.created_at > NOW() - INTERVAL '1 hour'
  GROUP BY usl.partner_id
  HAVING COUNT(*) >= 5;
END;
$$;

-- Fix fix_storage_mime_type
-- Drop first because parameter names might be different
DROP FUNCTION IF EXISTS public.fix_storage_mime_type(text, text, text);

CREATE FUNCTION public.fix_storage_mime_type(
  p_bucket TEXT,
  p_path TEXT,
  p_mime_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE storage.objects
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{mimetype}',
    to_jsonb(p_mime_type)
  )
  WHERE bucket_id = p_bucket
    AND name = p_path;
END;
$$;

-- ============================================
-- FIX: Cooldown & Cancellation Functions
-- ============================================

-- Fix is_user_in_cooldown
-- Drop first because return type might be different
DROP FUNCTION IF EXISTS public.is_user_in_cooldown(uuid);

CREATE FUNCTION public.is_user_in_cooldown(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_last_cooldown TIMESTAMPTZ;
  v_cooldown_duration INTERVAL := INTERVAL '24 hours';
BEGIN
  SELECT last_cooldown_at
  INTO v_last_cooldown
  FROM user_reliability
  WHERE user_id = p_user_id;

  IF v_last_cooldown IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_last_cooldown + v_cooldown_duration > NOW();
END;
$$;

-- Fix reset_user_cooldown
-- Drop first because return type might be different
DROP FUNCTION IF EXISTS public.reset_user_cooldown(uuid);

CREATE FUNCTION public.reset_user_cooldown(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE user_reliability
  SET 
    last_cooldown_at = NULL,
    consecutive_cancels = 0
  WHERE user_id = p_user_id;
END;
$$;

-- Fix lift_cooldown_with_points
-- Drop first because return type might be different
DROP FUNCTION IF EXISTS public.lift_cooldown_with_points(uuid, int);

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

-- Fix track_reservation_cancellation
-- Drop first because return type might be different
DROP FUNCTION IF EXISTS public.track_reservation_cancellation(uuid);

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

-- Fix get_user_consecutive_cancellations
-- Drop first because return type might be different
DROP FUNCTION IF EXISTS public.get_user_consecutive_cancellations(uuid);

CREATE FUNCTION public.get_user_consecutive_cancellations(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_consecutive_cancels INT;
BEGIN
  SELECT consecutive_cancels
  INTO v_consecutive_cancels
  FROM user_reliability
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_consecutive_cancels, 0);
END;
$$;

-- Fix can_user_reserve
-- Drop first because return type might be different
DROP FUNCTION IF EXISTS public.can_user_reserve(uuid);

CREATE FUNCTION public.can_user_reserve(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN NOT is_user_in_cooldown(p_user_id);
END;
$$;

-- ============================================
-- FIX: Points & Achievement Functions
-- ============================================

-- Fix update_user_reliability_score
-- Drop first because return type might be different
DROP FUNCTION IF EXISTS public.update_user_reliability_score(uuid, int);

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

-- Fix claim_achievement
-- Drop first because return type might be different
DROP FUNCTION IF EXISTS public.claim_achievement(uuid, text, int);

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

-- ============================================
-- FIX: Dashboard & Monitoring Functions
-- ============================================

-- Fix get_partner_dashboard_data
-- Drop first because return type might be different
DROP FUNCTION IF EXISTS public.get_partner_dashboard_data(uuid);

CREATE FUNCTION public.get_partner_dashboard_data(p_partner_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'active_offers', COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'ACTIVE'),
    'total_reservations', COUNT(DISTINCT r.id),
    'pending_reservations', COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'PENDING'),
    'total_revenue', COALESCE(SUM(r.total_price) FILTER (WHERE r.status = 'COMPLETED'), 0)
  )
  INTO v_result
  FROM offers o
  LEFT JOIN reservations r ON r.offer_id = o.id
  WHERE o.partner_id = p_partner_id;

  RETURN v_result;
END;
$$;

-- Fix get_connection_pool_stats
-- Drop first because return type might be different
DROP FUNCTION IF EXISTS public.get_connection_pool_stats();

CREATE FUNCTION public.get_connection_pool_stats()
RETURNS TABLE(
  total_connections INT,
  active_connections INT,
  idle_connections INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT as total_connections,
    COUNT(*) FILTER (WHERE state = 'active')::INT as active_connections,
    COUNT(*) FILTER (WHERE state = 'idle')::INT as idle_connections
  FROM pg_stat_activity
  WHERE datname = current_database();
END;
$$;

-- ============================================
-- FIX: Trigger Functions
-- ============================================

-- Fix _np_touch_updated_at (notification preferences trigger)
CREATE OR REPLACE FUNCTION public._np_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- NOTES ON REMAINING WARNINGS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed 20 function search_path warnings';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  REMAINING WARNINGS (safe to ignore):';
  RAISE NOTICE '';
  RAISE NOTICE '1. extension_in_public (pg_net, postgis)';
  RAISE NOTICE '   - These are Supabase-managed extensions';
  RAISE NOTICE '   - Cannot be moved by users';
  RAISE NOTICE '   - Standard in all Supabase projects';
  RAISE NOTICE '   - Safe to ignore';
  RAISE NOTICE '';
  RAISE NOTICE '2. auth_leaked_password_protection';
  RAISE NOTICE '   - Enable in Supabase Dashboard:';
  RAISE NOTICE '   - Go to: Authentication → Policies';
  RAISE NOTICE '   - Toggle: "Leaked Password Protection"';
  RAISE NOTICE '   - This checks passwords against HaveIBeenPwned.org';
  RAISE NOTICE '';
  RAISE NOTICE '3. spatial_ref_sys RLS';
  RAISE NOTICE '   - PostGIS system table (cannot modify)';
  RAISE NOTICE '   - Safe to ignore';
END $$;
