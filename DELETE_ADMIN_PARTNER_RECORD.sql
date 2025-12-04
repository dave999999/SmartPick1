-- =====================================================
-- Delete Partner Record for Admin User
-- =====================================================
-- This will remove the partner application and restore admin-only access
-- Run this in your Supabase SQL Editor (online dashboard)

-- Step 1: Check current status before deletion
SELECT 
  u.id as user_id,
  u.email,
  u.role as user_role,
  p.id as partner_id,
  p.business_name,
  p.status as partner_status
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
WHERE u.email = 'davitbatumashvili@gmail.com';

-- Step 2: Delete the partner record
DELETE FROM partners 
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com'
);

-- Step 3: Verify deletion (should return 0 partner records)
SELECT 
  u.id as user_id,
  u.email,
  u.role as user_role,
  p.id as partner_id
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
WHERE u.email = 'davitbatumashvili@gmail.com';

-- Expected result: user_role = 'ADMIN', partner_id = NULL

-- =====================================================
-- What This Does
-- =====================================================
-- ✅ Removes partner record completely
-- ✅ Keeps admin role in users table
-- ✅ Menu will show "Admin Panel" only (no "Partner Dashboard")
-- ✅ Prevents partner dashboard from appearing
