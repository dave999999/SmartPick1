-- Add penalty_warning_shown column to users table
-- This column tracks whether the user has acknowledged the penalty warning dialog

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS penalty_warning_shown BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN users.penalty_warning_shown IS 'Tracks whether user has acknowledged the penalty warning dialog';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_penalty_warning_shown 
ON users(penalty_warning_shown) 
WHERE penalty_warning_shown = FALSE;
