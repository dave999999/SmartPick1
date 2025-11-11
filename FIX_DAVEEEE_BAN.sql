-- =====================================================
-- FIX: Specific user daveeee (batumashvili.davit2@gmail.com) ban issue
-- =====================================================

-- STEP 1: Find the user daveeee and check their status
SELECT 
  id,
  email,
  name,
  role,
  status,
  penalty_count,
  penalty_until,
  is_banned,
  created_at
FROM users
WHERE email LIKE '%davit2%' 
   OR name LIKE '%daveeee%'
   OR email = 'batumashvili.davit2@gmail.com';

-- STEP 2: Check if there's a ban record in user_bans for this user
SELECT 
  ub.id as ban_id,
  ub.user_id,
  ub.banned_by,
  ub.ban_type,
  ub.reason,
  ub.is_active,
  ub.created_at,
  ub.expires_at,
  u.email as user_email,
  u.name as user_name,
  admin.email as banned_by_email
FROM user_bans ub
LEFT JOIN users u ON u.id = ub.user_id
LEFT JOIN users admin ON admin.id = ub.banned_by
WHERE u.email LIKE '%davit2%' 
   OR u.name LIKE '%daveeee%'
   OR ub.user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit2@gmail.com');

-- STEP 3: Check ALL active bans in user_bans table
SELECT 
  ub.id as ban_id,
  ub.user_id,
  ub.banned_by,
  ub.ban_type,
  ub.reason,
  ub.is_active,
  u.email as user_email,
  u.name as user_name,
  u.id as user_table_id
FROM user_bans ub
LEFT JOIN users u ON u.id = ub.user_id
WHERE ub.is_active = true
ORDER BY ub.created_at DESC;

-- STEP 4: Unban daveeee user - Fix BOTH systems
-- First, unban in users table
UPDATE users
SET 
  status = 'ACTIVE',
  penalty_count = 0,
  penalty_until = NULL,
  is_banned = false,
  updated_at = NOW()
WHERE email = 'batumashvili.davit2@gmail.com'
   OR name = 'daveeee'
RETURNING id, email, name, role, status, penalty_count;

-- STEP 5: Delete ban records instead of updating (due to unique constraint)
DELETE FROM user_bans
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit2@gmail.com')
   OR user_id IN (SELECT id FROM users WHERE name = 'daveeee')
RETURNING id, user_id, ban_type, is_active;

-- STEP 6: Delete any orphaned ban records (user_id doesn't exist in users table)
DELETE FROM user_bans
WHERE is_active = true
  AND user_id NOT IN (SELECT id FROM users)
RETURNING id, user_id, ban_type, reason;

-- STEP 7: Final verification - check both systems
SELECT 'Active bans in user_bans' as check_type, COUNT(*) as count
FROM user_bans WHERE is_active = true
UNION ALL
SELECT 'Users with BANNED status', COUNT(*)
FROM users WHERE status = 'BANNED'
UNION ALL
SELECT 'Users with is_banned=true', COUNT(*)
FROM users WHERE is_banned = true;

-- STEP 8: Verify daveeee user is now unbanned
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.status,
  u.penalty_count,
  u.is_banned,
  (SELECT COUNT(*) FROM user_bans WHERE user_id = u.id AND is_active = true) as active_bans
FROM users u
WHERE u.email = 'batumashvili.davit2@gmail.com'
   OR u.name = 'daveeee';
