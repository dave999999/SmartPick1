-- Add penalty system columns to users table
-- Run this in your Supabase SQL Editor

-- Add penalty_until column (timestamp when penalty expires)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS penalty_until TIMESTAMPTZ;

-- Add penalty_count column (number of missed pickups)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS penalty_count INTEGER DEFAULT 0;

-- Create index for efficient penalty checks
CREATE INDEX IF NOT EXISTS idx_users_penalty_until ON users(penalty_until);

-- Add comment for documentation
COMMENT ON COLUMN users.penalty_until IS 'Timestamp when user penalty expires (NULL if no active penalty)';
COMMENT ON COLUMN users.penalty_count IS 'Number of missed pickups (resets after successful pickup)';