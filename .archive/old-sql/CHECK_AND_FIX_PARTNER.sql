-- =====================================================
-- Check and Fix Partner Status for User
-- =====================================================
-- Run this to diagnose and fix the partner dashboard issue

-- Step 1: Check current status
SELECT 
  u.id as user_id,
  u.email,
  u.role as user_role,
  u.name,
  p.id as partner_id,
  p.business_name,
  p.status as partner_status,
  p.created_at
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
WHERE u.email = 'dave' OR u.email LIKE '%dave%' OR u.name = 'dave'
ORDER BY u.created_at DESC;

-- If partner_id is NULL, the user needs to apply as partner first
-- If partner_status is PENDING, run this to approve:

UPDATE partners 
SET status = 'APPROVED', updated_at = NOW()
WHERE user_id IN (
  SELECT u.id FROM users u 
  WHERE u.email = 'dave' OR u.email LIKE '%dave%' OR u.name = 'dave'
)
AND status = 'PENDING';

-- Step 2: Verify the fix
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.role as user_role,
  p.id as partner_id,
  p.business_name,
  p.status as partner_status
FROM users u
LEFT JOIN partners p ON p.user_id = u.id
WHERE u.email = 'dave' OR u.email LIKE '%dave%' OR u.name = 'dave';

-- Expected: partner_status should be 'APPROVED' for Partner Dashboard to appear
