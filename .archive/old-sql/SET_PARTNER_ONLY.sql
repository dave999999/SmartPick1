-- =====================================================
-- Set User as Partner Only (Remove Admin Role)
-- =====================================================
-- This will:
-- 1. Set user role to 'partner' (remove ADMIN)
-- 2. Approve the partner application if pending
-- Run this in your Supabase SQL Editor (online dashboard)

-- Step 1: Update user role to 'partner' (lowercase)
UPDATE users 
SET role = 'partner'
WHERE email = 'batumashvili.davit@gmail.com';

-- Step 2: Approve partner application if exists
UPDATE partners 
SET status = 'APPROVED', updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com'
)
AND status != 'APPROVED';

-- Step 3: Verify the changes
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

-- Expected result: user_role = 'partner', partner_status = 'APPROVED'

-- =====================================================
-- What This Does
-- =====================================================
-- ✅ Sets user role to 'partner' (not ADMIN)
-- ✅ Approves partner application in partners table
-- ✅ Menu will show "Partner Dashboard" ONLY (no Admin Panel)
-- ✅ User can only access partner features
