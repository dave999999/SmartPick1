-- Apply Security Enhancements Migrations
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql

-- ================================================
-- MIGRATION 1: Create rate_limits table
-- ================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.rate_limits CASCADE;

-- Create rate_limits table
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  action TEXT NOT NULL,
  identifier TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Index for fast lookups
  CONSTRAINT rate_limits_key_created_idx UNIQUE (key, created_at)
);

-- Create indexes for performance
CREATE INDEX idx_rate_limits_key ON public.rate_limits(key);
CREATE INDEX idx_rate_limits_action ON public.rate_limits(action);
CREATE INDEX idx_rate_limits_identifier ON public.rate_limits(identifier);
CREATE INDEX idx_rate_limits_created_at ON public.rate_limits(created_at);
CREATE INDEX idx_rate_limits_composite ON public.rate_limits(key, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: No direct access from client
-- Only Edge Functions with service_role can access this table
CREATE POLICY "Service role only access"
  ON public.rate_limits
  FOR ALL
  USING (false); -- Deny all client access

-- Grant permissions to service_role only
GRANT ALL ON public.rate_limits TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Add comment
COMMENT ON TABLE public.rate_limits IS 'Server-side rate limiting records. Accessed only by Edge Functions with service_role permissions.';

-- Clean up function (call this periodically via cron or maintenance)
CREATE OR REPLACE FUNCTION clean_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

COMMENT ON FUNCTION clean_old_rate_limits() IS 'Removes rate limit records older than 30 days to keep table size manageable';


-- ================================================
-- MIGRATION 2: Create csrf_tokens table
-- ================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.csrf_tokens CASCADE;

-- Create csrf_tokens table
CREATE TABLE public.csrf_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate active tokens per user
  CONSTRAINT unique_user_active_token UNIQUE (user_id, token)
);

-- Create indexes for performance
CREATE INDEX idx_csrf_tokens_user_id ON public.csrf_tokens(user_id);
CREATE INDEX idx_csrf_tokens_token ON public.csrf_tokens(token);
CREATE INDEX idx_csrf_tokens_expires_at ON public.csrf_tokens(expires_at);
CREATE INDEX idx_csrf_tokens_user_valid ON public.csrf_tokens(user_id, expires_at DESC);

-- Enable Row Level Security
ALTER TABLE public.csrf_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: No direct access from client
-- Only Edge Functions with service_role can access this table
CREATE POLICY "Service role only access"
  ON public.csrf_tokens
  FOR ALL
  USING (false); -- Deny all client access

-- Grant permissions to service_role only
GRANT ALL ON public.csrf_tokens TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Add comment
COMMENT ON TABLE public.csrf_tokens IS 'CSRF tokens for protecting sensitive operations. Accessed only by Edge Functions with service_role permissions.';

-- Clean up function (call this periodically via cron or maintenance)
CREATE OR REPLACE FUNCTION clean_expired_csrf_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.csrf_tokens
  WHERE expires_at < NOW();
END;
$$;

COMMENT ON FUNCTION clean_expired_csrf_tokens() IS 'Removes expired CSRF tokens to keep table size manageable';

-- Trigger to automatically clean up expired tokens on insert
CREATE OR REPLACE FUNCTION cleanup_csrf_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete expired tokens for this user
  DELETE FROM public.csrf_tokens
  WHERE user_id = NEW.user_id
    AND expires_at < NOW();
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_csrf_on_insert ON public.csrf_tokens;

CREATE TRIGGER trigger_cleanup_csrf_on_insert
  BEFORE INSERT ON public.csrf_tokens
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_csrf_on_insert();


-- ================================================
-- Verification Queries
-- ================================================

-- Check that tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('rate_limits', 'csrf_tokens');

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('rate_limits', 'csrf_tokens');

-- Test rate_limits table access (should work with service_role)
-- SELECT COUNT(*) FROM rate_limits;

-- Test csrf_tokens table access (should work with service_role)
-- SELECT COUNT(*) FROM csrf_tokens;
