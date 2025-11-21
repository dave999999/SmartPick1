-- Email Verification & Password Reset Token Tables
-- Created: 2025-11-21

-- Email Verification Tokens Table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

COMMENT ON TABLE email_verification_tokens IS 'Stores secure tokens for email verification with 30-minute expiry';
COMMENT ON COLUMN email_verification_tokens.used_at IS 'Timestamp when token was successfully used (null if unused)';

-- Password Reset Tokens Table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

COMMENT ON TABLE password_reset_tokens IS 'Stores secure tokens for password reset with 30-minute expiry';

-- Add email verification status to users table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'is_email_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT false;
    END IF;
END $$;

COMMENT ON COLUMN users.is_email_verified IS 'True when user has verified their email address';

-- RLS Policies for email_verification_tokens
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tokens
CREATE POLICY "Users can view own verification tokens"
    ON email_verification_tokens
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role can manage all tokens (for Edge Functions)
CREATE POLICY "Service role can manage verification tokens"
    ON email_verification_tokens
    FOR ALL
    TO service_role
    USING (true);

-- RLS Policies for password_reset_tokens
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tokens
CREATE POLICY "Users can view own reset tokens"
    ON password_reset_tokens
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Service role can manage all tokens (for Edge Functions)
CREATE POLICY "Service role can manage reset tokens"
    ON password_reset_tokens
    FOR ALL
    TO service_role
    USING (true);

-- Cleanup function to remove expired tokens (run daily via pg_cron or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete expired email verification tokens older than 1 hour
    DELETE FROM email_verification_tokens
    WHERE expires_at < NOW() - INTERVAL '1 hour';

    -- Delete expired password reset tokens older than 1 hour
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW() - INTERVAL '1 hour';
    
    -- Delete used tokens older than 7 days (keep for audit trail)
    DELETE FROM email_verification_tokens
    WHERE used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days';
    
    DELETE FROM password_reset_tokens
    WHERE used_at IS NOT NULL AND used_at < NOW() - INTERVAL '7 days';
END;
$$;

COMMENT ON FUNCTION cleanup_expired_tokens IS 'Removes expired and old used tokens to keep table clean';

-- Rate limiting table for email sending
CREATE TABLE IF NOT EXISTS email_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'verification' or 'password_reset'
    attempts INT DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    last_attempt TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_rate_limits_lookup ON email_rate_limits(email, action_type, window_start);

COMMENT ON TABLE email_rate_limits IS 'Rate limiting: max 3 emails per 15 minutes per email address per action type';

ALTER TABLE email_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role can manage rate limits"
    ON email_rate_limits
    FOR ALL
    TO service_role
    USING (true);

-- Function to check and enforce rate limits
CREATE OR REPLACE FUNCTION check_email_rate_limit(
    p_email TEXT,
    p_action_type TEXT,
    p_max_attempts INT DEFAULT 3,
    p_window_minutes INT DEFAULT 15
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_window_start TIMESTAMPTZ;
BEGIN
    v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
    
    -- Get existing rate limit record within current window
    SELECT * INTO v_record
    FROM email_rate_limits
    WHERE email = p_email
        AND action_type = p_action_type
        AND window_start > v_window_start
    ORDER BY window_start DESC
    LIMIT 1;
    
    -- If no record exists, create one and allow
    IF v_record IS NULL THEN
        INSERT INTO email_rate_limits (email, action_type, attempts, window_start, last_attempt)
        VALUES (p_email, p_action_type, 1, NOW(), NOW());
        RETURN TRUE;
    END IF;
    
    -- If record exists and attempts < max, increment and allow
    IF v_record.attempts < p_max_attempts THEN
        UPDATE email_rate_limits
        SET attempts = attempts + 1,
            last_attempt = NOW()
        WHERE id = v_record.id;
        RETURN TRUE;
    END IF;
    
    -- Rate limit exceeded
    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION check_email_rate_limit IS 'Returns TRUE if email can be sent, FALSE if rate limit exceeded';
