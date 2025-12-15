-- FIX: Update partner.user_id from email to actual auth.users.id UUID
-- Run this ONLY AFTER confirming partners.user_id contains emails!

-- Step 1: Backup current data
CREATE TABLE IF NOT EXISTS partners_user_id_backup AS
SELECT id, email, user_id, created_at
FROM partners;

-- Step 2: Update user_id to match auth.users.id based on email
UPDATE partners p
SET user_id = u.id::text
FROM auth.users u
WHERE p.email = u.email
AND p.user_id LIKE '%@%'; -- Only update rows where user_id looks like an email

-- Step 3: Verify the fix
SELECT 
  p.email,
  p.user_id as new_user_id,
  u.id as auth_user_id,
  CASE 
    WHEN p.user_id::text = u.id::text THEN '✅ FIXED'
    ELSE '❌ MISMATCH'
  END as status
FROM partners p
LEFT JOIN auth.users u ON u.email = p.email
WHERE p.email = 'batumashvili.davit@gmail.com';

-- Step 4: Check all partners are fixed
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN user_id LIKE '%@%' THEN 1 END) as still_has_email,
  COUNT(CASE WHEN user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as has_valid_uuid
FROM partners;
