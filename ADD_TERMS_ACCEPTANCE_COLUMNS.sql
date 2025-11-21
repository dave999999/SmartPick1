-- Migration: Add Terms Acceptance Tracking to Users Table
-- Purpose: Store when users accepted Terms & Conditions and Privacy Policy
-- Legal Requirement: GDPR and general compliance

-- Add terms acceptance columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS terms_version VARCHAR(10) DEFAULT '1.0';

-- Add comment for documentation
COMMENT ON COLUMN users.terms_accepted_at IS 'Timestamp when user accepted Terms & Conditions and Privacy Policy during signup';
COMMENT ON COLUMN users.terms_version IS 'Version of terms that user agreed to (e.g., 1.0, 1.1)';

-- Create index for faster queries on terms acceptance
CREATE INDEX IF NOT EXISTS idx_users_terms_accepted_at ON users(terms_accepted_at);

-- Optional: Update existing users to show they implicitly accepted terms
-- (Only if you want to backfill - be careful with legal implications)
-- UPDATE users
-- SET terms_accepted_at = created_at,
--     terms_version = '1.0'
-- WHERE terms_accepted_at IS NULL;

COMMENT ON TABLE users IS 'User accounts with authentication and profile information. Includes terms acceptance tracking for legal compliance.';
