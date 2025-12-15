-- =====================================================
-- Set User as ADMIN and Approve Partner Application
-- =====================================================
-- This will:
-- 1. Set user role to ADMIN
-- 2. Approve the partner application (if exists)
-- Run this in your Supabase SQL Editor (online dashboard)

-- Step 1: Update user role to ADMIN
UPDATE users 
SET role = 'ADMIN'
WHERE email = 'batumashvili.davit@gmail.com';

-- Step 2: Approve partner application (if exists)
UPDATE partners 
SET status = 'APPROVED', updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'
);

-- Step 3: Verify both changes
SELECT 
  u.id as user_id,
  u.email,
  u.role as user_role,
  p.id as partner_id,
  p.business_name,
  p.status as partner_status
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
WHERE u.email = 'batumashvili.davit@gmail.com';

-- Expected result: user_role = 'ADMIN', partner_status = 'APPROVED'

-- =====================================================
-- What This Does
-- =====================================================
-- ✅ Sets user role to ADMIN in users table
-- ✅ Approves partner application in partners table
-- ✅ Menu will show BOTH "Admin Panel" AND "Partner Dashboard"
-- ✅ User can access both admin and partner features
