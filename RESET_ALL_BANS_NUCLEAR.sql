-- =====================================================
-- COMPREHENSIVE FIX: Reset ALL ban systems completely
-- =====================================================

-- STEP 1: Show current state of ALL users
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
WHERE status = 'BANNED' OR is_banned = true OR penalty_count > 0
ORDER BY email;

-- STEP 2: Show ALL active bans in user_bans table
SELECT 
  ub.id as ban_id,
  ub.user_id,
  ub.ban_type,
  ub.reason,
  ub.is_active,
  u.email,
  u.name,
  u.status as user_status
FROM user_bans ub
LEFT JOIN users u ON u.id = ub.user_id
WHERE ub.is_active = true
ORDER BY u.email;

-- STEP 3: NUCLEAR OPTION - Delete ALL ban records from user_bans
DELETE FROM user_bans
WHERE is_active = true
RETURNING id, user_id, ban_type, reason;

-- STEP 4: Reset ALL users to ACTIVE status (clean slate)
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
WHERE status = 'BANNED' 
   OR is_banned = true 
   OR penalty_count > 0
   OR status IS NULL
RETURNING id, email, name, role, status, penalty_count, is_banned;

-- STEP 5: Verify EVERYTHING is clean
SELECT 'Total users' as check_type, COUNT(*) as count FROM users
UNION ALL
SELECT 'BANNED status', COUNT(*) FROM users WHERE status = 'BANNED'
UNION ALL
SELECT 'is_banned=true', COUNT(*) FROM users WHERE is_banned = true
UNION ALL
SELECT 'penalty_count>0', COUNT(*) FROM users WHERE penalty_count > 0
UNION ALL
SELECT 'Active bans in user_bans', COUNT(*) FROM user_bans WHERE is_active = true;

-- STEP 6: Show all users summary by role
SELECT 
  role,
  status,
  COUNT(*) as count
FROM users
GROUP BY role, status
ORDER BY role, status;

-- STEP 7: Show specific users that were banned
SELECT 
  email,
  name,
  role,
  status,
  penalty_count,
  is_banned,
  (SELECT COUNT(*) FROM user_bans WHERE user_id = users.id AND is_active = true) as active_bans
FROM users
WHERE email IN (
  'batumashvili.davit2@gmail.com',
  'batumashvili.davit3@gmail.com',
  'batumashvili.davit4@gmail.com',
  'batumashvili.davit5@gmail.com'
)
ORDER BY email;
