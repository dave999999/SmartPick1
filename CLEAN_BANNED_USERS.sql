-- =====================================================
-- FIX: Clean up banned users data
-- =====================================================

-- STEP 1: Check what users exist with BANNED status
SELECT 
  id,
  email,
  name,
  role,
  status,
  penalty_count,
  penalty_until,
  is_banned,
  created_at,
  updated_at
FROM users
WHERE status = 'BANNED'
   OR is_banned = true;

-- STEP 2: Check if admin user (davitbatumashvili@gmail.com) has any ban flags
SELECT 
  id,
  email,
  name,
  role,
  status,
  penalty_count,
  penalty_until,
  is_banned,
  created_at,
  updated_at
FROM users
WHERE email = 'davitbatumashvili@gmail.com';

-- STEP 3: Clean up - unban ALL users (since you said it was by mistake)
UPDATE users
SET 
  status = CASE 
    WHEN role = 'ADMIN' THEN 'ACTIVE'
    WHEN role = 'PARTNER' THEN 'ACTIVE'
    WHEN role = 'CUSTOMER' THEN 'ACTIVE'
    ELSE status
  END,
  penalty_count = 0,
  penalty_until = NULL,
  is_banned = false,
  updated_at = NOW()
WHERE status = 'BANNED' OR is_banned = true
RETURNING id, email, name, role, status, is_banned;

-- STEP 4: Verify all users are now unbanned
SELECT 
  role,
  status,
  COUNT(*) as count
FROM users
GROUP BY role, status
ORDER BY role, status;

-- STEP 5: Check if there are any remaining banned users
SELECT 
  id,
  email,
  name,
  role,
  status,
  penalty_count,
  is_banned
FROM users
WHERE status = 'BANNED' OR is_banned = true;

-- STEP 6: Double-check admin user specifically
SELECT 
  id,
  email,
  name,
  role,
  status,
  penalty_count,
  penalty_until,
  is_banned
FROM users
WHERE email = 'davitbatumashvili@gmail.com';
