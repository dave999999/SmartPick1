-- ================================================
-- CREATE: rate_limits table for server-side rate limiting
-- Replaces client-side localStorage with secure server storage
-- ================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.rate_limits;

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
