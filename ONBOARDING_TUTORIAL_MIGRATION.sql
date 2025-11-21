-- =====================================================
-- ONBOARDING TUTORIAL MIGRATION
-- =====================================================
-- Purpose: Add onboarding_completed tracking field to users table
-- This field tracks whether a user has completed the new user tutorial
-- that appears after signup to reduce drop-off and improve retention
-- =====================================================

-- Add onboarding_completed field (defaults to false)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add comment to document the field
COMMENT ON COLUMN users.onboarding_completed IS 
'Tracks whether user has completed the onboarding tutorial shown after signup. Used to prevent showing tutorial multiple times.';

-- Create index for filtering users who haven't completed onboarding
-- (useful for admin dashboard analytics and engagement tracking)
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed 
ON users(onboarding_completed);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if column was added successfully
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'onboarding_completed';

-- Check onboarding completion rate
SELECT 
  onboarding_completed,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM users
WHERE role = 'CUSTOMER'
GROUP BY onboarding_completed;

-- Find users who haven't completed onboarding (potential intervention targets)
SELECT 
  id,
  name,
  email,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_since_signup
FROM users
WHERE role = 'CUSTOMER'
  AND onboarding_completed = FALSE
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 50;
