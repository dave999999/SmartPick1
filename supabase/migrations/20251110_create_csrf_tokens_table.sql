-- ================================================
-- CREATE: csrf_tokens table for CSRF protection
-- Stores secure tokens to prevent cross-site request forgery
-- ================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS public.csrf_tokens;

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
CREATE INDEX idx_csrf_tokens_user_valid ON public.csrf_tokens(user_id, expires_at DESC) WHERE expires_at > NOW();

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

CREATE TRIGGER trigger_cleanup_csrf_on_insert
  BEFORE INSERT ON public.csrf_tokens
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_csrf_on_insert();
