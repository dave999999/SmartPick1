-- ============================================================================
-- ADVANCED RATE LIMITING & SESSION SECURITY
-- ============================================================================
-- Purpose: IP-based rate limiting with suspicious activity detection
-- Date: 2026-01-05
-- Security Level: Production-grade
-- ============================================================================

-- ============================================================================
-- 1. ENHANCED RATE LIMITS TABLE WITH IP TRACKING
-- ============================================================================

-- Add IP tracking columns if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'rate_limits' AND column_name = 'ip_address') THEN
    ALTER TABLE public.rate_limits ADD COLUMN ip_address TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'rate_limits' AND column_name = 'user_agent') THEN
    ALTER TABLE public.rate_limits ADD COLUMN user_agent TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'rate_limits' AND column_name = 'country_code') THEN
    ALTER TABLE public.rate_limits ADD COLUMN country_code TEXT;
  END IF;
END $$;

-- Create composite index for IP-based queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action 
  ON public.rate_limits(ip_address, action, created_at DESC);

-- Create index for suspicious activity detection (removed NOW() from WHERE - not immutable)
CREATE INDEX IF NOT EXISTS idx_rate_limits_suspicious 
  ON public.rate_limits(identifier, ip_address, created_at DESC);

COMMENT ON COLUMN public.rate_limits.ip_address IS 'Source IP address for geo-blocking and suspicious activity detection';
COMMENT ON COLUMN public.rate_limits.user_agent IS 'Client user agent for bot detection';
COMMENT ON COLUMN public.rate_limits.country_code IS 'Country code from Cloudflare/Vercel headers for geo-restrictions';

-- ============================================================================
-- 2. SESSION SECURITY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  country_code TEXT,
  device_type TEXT, -- 'web', 'android', 'ios'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT
);

-- Indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id, is_valid);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON public.user_sessions(session_id) WHERE is_valid = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at) WHERE is_valid = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity_at) WHERE is_valid = true;

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users and service can access sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can insert sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can update sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Service role can delete sessions" ON public.user_sessions;

-- RLS Policies: Optimized single policy for users and service role
CREATE POLICY "Users and service can access sessions"
  ON public.user_sessions FOR SELECT
  USING (
    (select auth.uid()) = user_id 
    OR (select auth.role()) = 'service_role'
  );

CREATE POLICY "Service role can insert sessions"
  ON public.user_sessions FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Service role can update sessions"
  ON public.user_sessions FOR UPDATE
  USING ((select auth.role()) = 'service_role');

CREATE POLICY "Service role can delete sessions"
  ON public.user_sessions FOR DELETE
  USING ((select auth.role()) = 'service_role');

COMMENT ON TABLE public.user_sessions IS 'Tracks active user sessions for security monitoring and timeout enforcement';

-- ============================================================================
-- 3. SUSPICIOUS ACTIVITY LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.suspicious_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'rate_limit_exceeded', 'session_hijack', 'geo_anomaly', 'brute_force'
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_user_id ON public.suspicious_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_ip ON public.suspicious_activity(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_unresolved ON public.suspicious_activity(resolved, severity, created_at DESC) WHERE NOT resolved;

-- Enable RLS
ALTER TABLE public.suspicious_activity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view suspicious activity" ON public.suspicious_activity;
DROP POLICY IF EXISTS "Service role can manage suspicious activity" ON public.suspicious_activity;
DROP POLICY IF EXISTS "Admins and service can view suspicious activity" ON public.suspicious_activity;
DROP POLICY IF EXISTS "Service role can insert suspicious activity" ON public.suspicious_activity;
DROP POLICY IF EXISTS "Service role can update suspicious activity" ON public.suspicious_activity;
DROP POLICY IF EXISTS "Service role can delete suspicious activity" ON public.suspicious_activity;

-- RLS: Optimized single policy for admins and service role
CREATE POLICY "Admins and service can view suspicious activity"
  ON public.suspicious_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid()) AND users.role = 'admin'
    )
    OR (select auth.role()) = 'service_role'
  );

CREATE POLICY "Service role can insert suspicious activity"
  ON public.suspicious_activity FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Service role can update suspicious activity"
  ON public.suspicious_activity FOR UPDATE
  USING ((select auth.role()) = 'service_role');

CREATE POLICY "Service role can delete suspicious activity"
  ON public.suspicious_activity FOR DELETE
  USING ((select auth.role()) = 'service_role');

COMMENT ON TABLE public.suspicious_activity IS 'Logs suspicious security events for investigation and automated blocking';

-- ============================================================================
-- 4. IP BLOCKLIST
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ip_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ, -- NULL = permanent block
  is_active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT ip_blocklist_ip_address_check CHECK (ip_address ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$' OR ip_address ~ '^[0-9a-fA-F:]+$')
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_active ON public.ip_blocklist(ip_address, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.ip_blocklist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view blocklist" ON public.ip_blocklist;
DROP POLICY IF EXISTS "Service role can manage blocklist" ON public.ip_blocklist;
DROP POLICY IF EXISTS "Admins and service can view blocklist" ON public.ip_blocklist;
DROP POLICY IF EXISTS "Service role can insert blocklist" ON public.ip_blocklist;
DROP POLICY IF EXISTS "Service role can update blocklist" ON public.ip_blocklist;
DROP POLICY IF EXISTS "Service role can delete blocklist" ON public.ip_blocklist;

-- RLS: Optimized single policy for admins and service role
CREATE POLICY "Admins and service can view blocklist"
  ON public.ip_blocklist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = (select auth.uid()) AND users.role = 'admin'
    )
    OR (select auth.role()) = 'service_role'
  );

CREATE POLICY "Service role can insert blocklist"
  ON public.ip_blocklist FOR INSERT
  WITH CHECK ((select auth.role()) = 'service_role');

CREATE POLICY "Service role can update blocklist"
  ON public.ip_blocklist FOR UPDATE
  USING ((select auth.role()) = 'service_role');

CREATE POLICY "Service role can delete blocklist"
  ON public.ip_blocklist FOR DELETE
  USING ((select auth.role()) = 'service_role');

COMMENT ON TABLE public.ip_blocklist IS 'Blocked IP addresses from suspicious or malicious activity';

-- ============================================================================
-- 5. ADVANCED RATE LIMITING FUNCTIONS
-- ============================================================================

-- Check if IP is blocked
CREATE OR REPLACE FUNCTION is_ip_blocked(p_ip_address TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ip_blocklist
    WHERE ip_address = p_ip_address
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;

COMMENT ON FUNCTION is_ip_blocked IS 'Check if an IP address is currently blocked';

-- Log suspicious activity with automatic IP blocking
CREATE OR REPLACE FUNCTION log_suspicious_activity(
  p_user_id UUID,
  p_ip_address TEXT,
  p_activity_type TEXT,
  p_severity TEXT,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_auto_block BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_activity_id UUID;
  v_recent_count INT;
BEGIN
  -- Insert suspicious activity log
  INSERT INTO public.suspicious_activity (
    user_id, ip_address, activity_type, severity, details
  ) VALUES (
    p_user_id, p_ip_address, p_activity_type, p_severity, p_details
  ) RETURNING id INTO v_activity_id;

  -- Check for repeated suspicious activity from same IP (within 1 hour)
  SELECT COUNT(*) INTO v_recent_count
  FROM public.suspicious_activity
  WHERE ip_address = p_ip_address
    AND created_at > NOW() - INTERVAL '1 hour'
    AND severity IN ('high', 'critical');

  -- Auto-block IP if multiple high-severity incidents OR explicit auto-block
  IF v_recent_count >= 3 OR p_auto_block THEN
    INSERT INTO public.ip_blocklist (ip_address, reason, expires_at)
    VALUES (
      p_ip_address,
      format('Automatic block: %s suspicious activities (%s)', v_recent_count, p_activity_type),
      NOW() + INTERVAL '24 hours'
    )
    ON CONFLICT (ip_address) DO UPDATE
    SET is_active = true,
        expires_at = NOW() + INTERVAL '24 hours',
        reason = EXCLUDED.reason;

    RAISE NOTICE 'IP % automatically blocked due to suspicious activity', p_ip_address;
  END IF;

  RETURN v_activity_id;
END;
$$;

COMMENT ON FUNCTION log_suspicious_activity IS 'Log suspicious activity and optionally auto-block IP after repeated offenses';

-- ============================================================================
-- 6. SESSION TIMEOUT MONITORING
-- ============================================================================

-- Invalidate expired sessions
CREATE OR REPLACE FUNCTION invalidate_expired_sessions()
RETURNS TABLE (
  session_id TEXT,
  user_id UUID,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.user_sessions us
  SET 
    is_valid = false,
    invalidated_at = NOW(),
    invalidation_reason = 'Session expired'
  WHERE us.is_valid = true
    AND us.expires_at < NOW()
  RETURNING us.session_id, us.user_id, 'expired' as reason;
END;
$$;

COMMENT ON FUNCTION invalidate_expired_sessions IS 'Invalidate sessions that have exceeded their expiration time';

-- Invalidate sessions with suspicious inactivity timeout
CREATE OR REPLACE FUNCTION invalidate_inactive_sessions(
  p_inactivity_minutes INT DEFAULT 30
)
RETURNS TABLE (
  session_id TEXT,
  user_id UUID,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.user_sessions us
  SET 
    is_valid = false,
    invalidated_at = NOW(),
    invalidation_reason = format('Inactive for %s minutes', p_inactivity_minutes)
  WHERE us.is_valid = true
    AND us.last_activity_at < NOW() - (p_inactivity_minutes || ' minutes')::INTERVAL
  RETURNING us.session_id, us.user_id, 'inactivity_timeout' as reason;
END;
$$;

COMMENT ON FUNCTION invalidate_inactive_sessions IS 'Invalidate sessions with no activity for specified duration (default 30 minutes)';

-- Detect session hijacking attempts (same user, different IPs simultaneously)
CREATE OR REPLACE FUNCTION detect_session_anomalies()
RETURNS TABLE (
  user_id UUID,
  session_count INT,
  ip_addresses TEXT[],
  suspicious_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_active_sessions AS (
    SELECT 
      us.user_id,
      COUNT(DISTINCT us.session_id) as session_count,
      COUNT(DISTINCT us.ip_address) as ip_count,
      ARRAY_AGG(DISTINCT us.ip_address) as ip_addresses,
      MAX(us.last_activity_at) as latest_activity
    FROM public.user_sessions us
    WHERE us.is_valid = true
      AND us.last_activity_at > NOW() - INTERVAL '15 minutes'
    GROUP BY us.user_id
  )
  SELECT 
    uas.user_id,
    uas.session_count::INT,
    uas.ip_addresses,
    CASE
      WHEN uas.ip_count > 3 THEN 'Multiple IPs simultaneously (possible session hijacking)'
      WHEN uas.session_count > 5 THEN 'Too many concurrent sessions'
      ELSE 'Unknown anomaly'
    END as suspicious_reason
  FROM user_active_sessions uas
  WHERE uas.ip_count > 3 OR uas.session_count > 5;
END;
$$;

COMMENT ON FUNCTION detect_session_anomalies IS 'Detect suspicious session patterns indicating potential hijacking or credential sharing';

-- Update session activity timestamp
CREATE OR REPLACE FUNCTION update_session_activity(
  p_session_id TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE public.user_sessions
  SET last_activity_at = NOW()
  WHERE session_id = p_session_id
    AND user_id = p_user_id
    AND is_valid = true
  RETURNING true INTO v_updated;

  RETURN COALESCE(v_updated, false);
END;
$$;

COMMENT ON FUNCTION update_session_activity IS 'Update last activity timestamp for session heartbeat monitoring';

-- ============================================================================
-- 7. AUTOMATED CLEANUP & MONITORING
-- ============================================================================

-- Clean old rate limit records (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Remove rate limit records older than 7 days (call via pg_cron)';

-- Clean old suspicious activity logs (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_suspicious_activity()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM public.suspicious_activity
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND resolved = true;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_suspicious_activity IS 'Archive resolved suspicious activity older than 90 days';

-- Clean expired IP blocks
CREATE OR REPLACE FUNCTION cleanup_expired_ip_blocks()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_updated_count INT;
BEGIN
  UPDATE public.ip_blocklist
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_ip_blocks IS 'Deactivate IP blocks that have expired';

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_ip_blocked TO service_role;
GRANT EXECUTE ON FUNCTION log_suspicious_activity TO service_role;
GRANT EXECUTE ON FUNCTION invalidate_expired_sessions TO service_role;
GRANT EXECUTE ON FUNCTION invalidate_inactive_sessions TO service_role;
GRANT EXECUTE ON FUNCTION detect_session_anomalies TO service_role;
GRANT EXECUTE ON FUNCTION update_session_activity TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_suspicious_activity TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_ip_blocks TO service_role;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Update Edge Functions to use enhanced rate limiting with IP tracking
-- 2. Implement session heartbeat in frontend (update_session_activity every 5 min)
-- 3. Set up pg_cron jobs for automated cleanup:
--    - SELECT cleanup_old_rate_limits() every day
--    - SELECT invalidate_expired_sessions() every 5 minutes
--    - SELECT invalidate_inactive_sessions() every 10 minutes
--    - SELECT cleanup_expired_ip_blocks() every hour
-- 4. Monitor suspicious_activity table for security incidents
-- ============================================================================
