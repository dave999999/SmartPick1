-- =========================================================
-- REALTIME PRESENCE TRACKING SYSTEM
-- =========================================================
-- Purpose: Track online users across Web/iOS/Android platforms
-- Efficient: Uses heartbeat updates every 60 seconds
-- Auto-cleanup: Removes stale presence after 5 minutes

-- Create presence tracking table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('WEB', 'IOS', 'ANDROID')),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_platform ON user_presence(platform);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Users can only update their own presence
CREATE POLICY "Users can update own presence"
  ON user_presence
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all presence
CREATE POLICY "Admins can view all presence"
  ON user_presence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (SELECT auth.uid()) 
        AND users.role = 'ADMIN'
    )
  );

-- Function to update user presence (called by clients every 60s)
CREATE OR REPLACE FUNCTION update_user_presence(
  p_platform TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, platform, last_seen, user_agent, ip_address, updated_at)
  VALUES (
    auth.uid(),
    UPPER(p_platform),
    pg_catalog.now(),
    p_user_agent,
    p_ip_address,
    pg_catalog.now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    platform = EXCLUDED.platform,
    last_seen = EXCLUDED.last_seen,
    user_agent = EXCLUDED.user_agent,
    ip_address = EXCLUDED.ip_address,
    updated_at = EXCLUDED.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_presence(TEXT, TEXT, INET) TO authenticated;

-- Function to get online users count (optimized for admin dashboard)
CREATE OR REPLACE FUNCTION get_online_stats()
RETURNS TABLE (
  total_online BIGINT,
  web_online BIGINT,
  ios_online BIGINT,
  android_online BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
BEGIN
  -- Only consider users active in last 5 minutes
  v_cutoff := pg_catalog.now() - INTERVAL '5 minutes';
  
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_online,
    COUNT(*) FILTER (WHERE platform = 'WEB')::BIGINT as web_online,
    COUNT(*) FILTER (WHERE platform = 'IOS')::BIGINT as ios_online,
    COUNT(*) FILTER (WHERE platform = 'ANDROID')::BIGINT as android_online
  FROM public.user_presence
  WHERE last_seen > v_cutoff;
END;
$$;

GRANT EXECUTE ON FUNCTION get_online_stats() TO authenticated;

-- Cleanup function to remove stale presence (run via cron every 10 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Remove presence records older than 10 minutes (2x timeout buffer)
  DELETE FROM public.user_presence
  WHERE last_seen < pg_catalog.now() - INTERVAL '10 minutes';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_stale_presence() TO authenticated;

-- Add comments
COMMENT ON TABLE user_presence IS 
  'Tracks online users in real-time. Updated every 60s by clients. 
   Stale records (>10min) are auto-cleaned via cron job.';

COMMENT ON FUNCTION update_user_presence(TEXT, TEXT, INET) IS 
  'Called by clients every 60s to maintain presence. 
   Upserts user presence with platform and metadata.';

COMMENT ON FUNCTION get_online_stats() IS 
  'Returns online user counts by platform (5min window). 
   Optimized for admin dashboard with single aggregation query.';

COMMENT ON FUNCTION cleanup_stale_presence() IS 
  'Removes stale presence records (>10min old). 
   Run via cron job every 10 minutes.';

-- Verification queries
SELECT 
  '=== PRESENCE TRACKING CREATED ===' as status,
  'Users will report presence every 60s' as message;

SELECT 
  'Table:' as type,
  'user_presence' as name
UNION ALL
SELECT 
  'Function:' as type,
  'update_user_presence(TEXT, TEXT, INET)' as name
UNION ALL
SELECT 
  'Function:' as type,
  'get_online_stats()' as name
UNION ALL
SELECT 
  'Function:' as type,
  'cleanup_stale_presence()' as name;
