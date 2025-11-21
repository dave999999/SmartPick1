-- =====================================================
-- FIX: Clean up user_bans table (the REAL ban system)
-- =====================================================

-- STEP 1: Check what's in the user_bans table
SELECT 
  ub.id as ban_id,
  ub.user_id,
  ub.banned_by,
  ub.ban_type,
  ub.reason,
  ub.created_at as banned_at,
  ub.expires_at,
  ub.is_active,
  u.email as user_email,
  u.name as user_name,
  u.role as user_role,
  admin.email as admin_email
FROM user_bans ub
LEFT JOIN users u ON u.id = ub.user_id
LEFT JOIN users admin ON admin.id = ub.banned_by
WHERE ub.is_active = true
ORDER BY ub.created_at DESC;

-- STEP 2: Delete all active bans (since you said they were by mistake)
DELETE FROM user_bans
WHERE is_active = true
RETURNING id, user_id, ban_type, reason, created_at;

-- STEP 3: Verify no active bans remain
SELECT 
  ub.id,
  ub.user_id,
  ub.is_active,
  u.email
FROM user_bans ub
LEFT JOIN users u ON u.id = ub.user_id
WHERE ub.is_active = true;

-- STEP 4: Check users table - ensure no one has BANNED status
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

-- STEP 5: Clean up users table too (just in case)
UPDATE users
SET 
  status = CASE 
    WHEN role = 'ADMIN' THEN 'ACTIVE'
    WHEN role = 'PARTNER' THEN 'ACTIVE'
    WHEN role = 'CUSTOMER' THEN 'ACTIVE'
    ELSE 'ACTIVE'
  END,
  penalty_count = 0,
  penalty_until = NULL,
  is_banned = false,
  updated_at = NOW()
WHERE status = 'BANNED' OR is_banned = true OR penalty_count > 0
RETURNING id, email, name, role, status, penalty_count;

-- STEP 6: Final verification - check both systems
SELECT 'user_bans active bans' as check_type, COUNT(*) as count
FROM user_bans WHERE is_active = true
UNION ALL
SELECT 'users with BANNED status', COUNT(*)
FROM users WHERE status = 'BANNED'
UNION ALL
SELECT 'users with is_banned=true', COUNT(*)
FROM users WHERE is_banned = true
UNION ALL
SELECT 'users with penalty_count>0', COUNT(*)
FROM users WHERE penalty_count > 0;

-- STEP 7: Show all users status summary
SELECT 
  role,
  status,
  COUNT(*) as count,
  SUM(CASE WHEN penalty_count > 0 THEN 1 ELSE 0 END) as has_penalties
FROM users
GROUP BY role, status
ORDER BY role, status;
