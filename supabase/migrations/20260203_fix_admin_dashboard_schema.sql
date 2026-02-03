-- ========================================
-- EMERGENCY FIX: Admin Dashboard Database Issues
-- ========================================
-- This migration fixes critical schema mismatches
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Add points_balance column to users table
-- This is the PRIMARY points storage (app uses this, not user_points)
ALTER TABLE users ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0 NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_points_balance ON users(points_balance);

-- 2. If user_points table has data, migrate it to users.points_balance
-- (Currently user_points is empty, but this handles future case)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM user_points LIMIT 1) THEN
    UPDATE users u 
    SET points_balance = COALESCE(
      (SELECT balance FROM user_points WHERE user_id = u.id),
      0
    );
    
    RAISE NOTICE 'Migrated points from user_points to users.points_balance';
  ELSE
    RAISE NOTICE 'user_points table is empty, no migration needed';
  END IF;
END $$;

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
  points_col_exists BOOLEAN;
  admin_count INTEGER;
BEGIN
  -- Check if points_balance column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'points_balance'
  ) INTO points_col_exists;
  
  IF points_col_exists THEN
    RAISE NOTICE '✅ users.points_balance column exists';
  ELSE
    RAISE WARNING '❌ users.points_balance column missing!';
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
  'Users with points_balance' as check_type,
  COUNT(*) as count,
  SUM(points_balance) as total_points
FROM users;

SELECT 
  'Admin users' as check_type,
  COUNT(*) as count
FROM users 
WHERE role = 'ADMIN';

SELECT 
  'Offers by status' as check_type,
  status,
  COUNT(*) as count
FROM offers
GROUP BY status
ORDER BY count DESC;
