-- =====================================================
-- EMERGENCY: Unban admin user davitbatumashvili@gmail.com
-- =====================================================

-- STEP 1: Check current ban status
SELECT 
  u.id,
  u.email,
  u.role,
  b.id as ban_id,
  b.ban_type,
  b.reason,
  b.banned_at,
  b.expires_at,
  b.banned_by
FROM users u
LEFT JOIN banned_users b ON b.user_id = u.id AND b.is_active = true
WHERE u.email = 'davitbatumashvili@gmail.com';

-- STEP 2: Unban the admin user by deactivating the ban
UPDATE banned_users
SET is_active = false,
    unbanned_at = NOW(),
    unbanned_by = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
WHERE user_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
  AND is_active = true
RETURNING id, user_id, ban_type, banned_at, unbanned_at;

-- STEP 3: Verify the user is now unbanned
SELECT 
  u.id,
  u.email,
  u.role,
  u.status,
  COUNT(b.id) FILTER (WHERE b.is_active = true) as active_bans
FROM users u
LEFT JOIN banned_users b ON b.user_id = u.id
WHERE u.email = 'davitbatumashvili@gmail.com'
GROUP BY u.id, u.email, u.role, u.status;

-- STEP 4: Ensure admin status is correct
UPDATE users
SET status = 'ACTIVE'
WHERE email = 'davitbatumashvili@gmail.com'
  AND role = 'ADMIN'
RETURNING id, email, role, status;

-- STEP 5: Check final state
SELECT 
  u.id,
  u.email,
  u.role,
  u.status,
  u.created_at,
  (SELECT COUNT(*) FROM banned_users WHERE user_id = u.id AND is_active = true) as active_bans,
  (SELECT COUNT(*) FROM banned_users WHERE user_id = u.id AND is_active = false) as past_bans
FROM users u
WHERE u.email = 'davitbatumashvili@gmail.com';
