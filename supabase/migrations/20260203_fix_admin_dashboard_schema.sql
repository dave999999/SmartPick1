-- ========================================
-- EMERGENCY FIX: Admin Dashboard Database Issues
-- ========================================
-- This migration ensures all users have entries in user_points table
-- and creates admin user if needed

BEGIN;

-- 1. Ensure ALL existing users have a user_points entry
-- (user_points.balance is the ACTUAL points storage, not users.points_balance)
INSERT INTO user_points (user_id, balance, updated_at)
SELECT 
  id as user_id,
  100 as balance, -- Default 100 points for existing users
  now() as updated_at
FROM users
WHERE id NOT IN (SELECT user_id FROM user_points)
ON CONFLICT (user_id) DO NOTHING;

-- 2. Create index if not exists (for admin queries performance)
CREATE INDEX IF NOT EXISTS idx_user_points_balance ON user_points(balance);

-- 3. Update admin users (REPLACE WITH YOUR ACTUAL ADMIN EMAIL!)
-- Find users who should be admins and update their role
DO $$
DECLARE
  admin_email TEXT;
  admin_count INTEGER;
BEGIN
  -- Check if any admins exist
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'ADMIN';
  
  IF admin_count = 0 THEN
    -- Try to find the first user (likely the app owner)
    SELECT email INTO admin_email FROM users ORDER BY created_at ASC LIMIT 1;
    
    IF admin_email IS NOT NULL THEN
      UPDATE users SET role = 'ADMIN' WHERE email = admin_email;
      RAISE NOTICE 'Made % an admin', admin_email;
    ELSE
      RAISE NOTICE 'No users found to make admin. Create a user first.';
    END IF;
  ELSE
    RAISE NOTICE '% admin(s) already exist', admin_count;
  END IF;
END $$;

-- 4. Verify the fixes
DO $$
DECLARE
  points_entries INTEGER;
  admin_count INTEGER;
  users_count INTEGER;
BEGIN
  -- Check user_points entries
  SELECT COUNT(*) INTO users_count FROM users;
  SELECT COUNT(*) INTO points_entries FROM user_points;
  
  IF points_entries >= users_count THEN
    RAISE NOTICE '✅ All % users have user_points entries', users_count;
  ELSE
    RAISE WARNING '⚠️  Only %/% users have user_points entries', points_entries, users_count;
  END IF;
  
  -- Check admin users
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'ADMIN';
  IF admin_count > 0 THEN
    RAISE NOTICE '✅ % admin user(s) exist', admin_count;
  ELSE
    RAISE WARNING '❌ No admin users found!';
  END IF;
END $$;

COMMIT;

-- 5. Display current state
SELECT 
  'User points coverage' as check_type,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT up.user_id) as users_with_points,
  COALESCE(SUM(up.balance), 0) as total_points_in_system
FROM users u
LEFT JOIN user_points up ON u.id = up.user_id;

SELECT 
  'Admin users' as check_type,
  COUNT(*) as count,
  string_agg(email, ', ') as admin_emails
FROM users 
WHERE role = 'ADMIN';

SELECT 
  'Points distribution' as check_type,
  MIN(balance) as min_balance,
  MAX(balance) as max_balance,
  AVG(balance)::INTEGER as avg_balance,
  COUNT(*) as total_users
FROM user_points;
