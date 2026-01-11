-- =========================================================
-- UNIFIED BANNED USERS VIEW
-- =========================================================
-- Purpose: Combine manual bans (user_bans) and automatic penalties
-- Makes it easy to see all banned users in one query
--
-- This view merges:
-- 1. Manual admin bans (user_bans table)
-- 2. Automatic penalty bans (user_penalties table, offense >= 6)

DROP VIEW IF EXISTS admin_all_banned_users CASCADE;

CREATE VIEW admin_all_banned_users 
WITH (security_invoker = true)
AS

-- Manual Bans (admin imposed)
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.phone,
  u.created_at as user_joined_at,
  'MANUAL' as ban_source,
  ub.ban_type as ban_type,
  ub.reason as ban_reason,
  ub.created_at as banned_at,
  ub.expires_at as expires_at,
  ub.banned_by as banned_by_admin_id,
  admin.email as banned_by_admin_email,
  admin.name as banned_by_admin_name,
  ub.internal_notes as additional_notes,
  ub.is_active as ban_is_active,
  CASE 
    WHEN NOT ub.is_active THEN FALSE
    WHEN ub.expires_at IS NULL THEN TRUE
    WHEN ub.expires_at > NOW() THEN TRUE
    ELSE FALSE
  END as is_currently_banned,
  CASE
    WHEN NOT ub.is_active THEN 'INACTIVE'
    WHEN ub.expires_at IS NULL THEN 'PERMANENT'
    WHEN ub.expires_at > NOW() THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as ban_status
FROM users u
INNER JOIN user_bans ub ON u.id = ub.user_id
LEFT JOIN users admin ON admin.id = ub.banned_by

UNION ALL

-- Automatic Penalties (6th offense = permanent ban)
SELECT 
  u.id as user_id,
  u.email,
  u.name,
  u.phone,
  u.created_at as user_joined_at,
  'AUTO_PENALTY' as ban_source,
  up.penalty_type as ban_type,
  'Missed ' || up.offense_number || ' pickups - Automatic ' || 
    CASE 
      WHEN up.penalty_type = 'permanent' THEN 'permanent ban'
      ELSE up.penalty_type || ' suspension'
    END as ban_reason,
  up.created_at as banned_at,
  up.suspended_until as expires_at,
  NULL as banned_by_admin_id,
  'SYSTEM' as banned_by_admin_email,
  'SYSTEM' as banned_by_admin_name,
  'Offense #' || up.offense_number || ' - ' || up.penalty_type || 
    ' (Reservation ID: ' || COALESCE(up.reservation_id::text, 'N/A') || ')' as additional_notes,
  up.is_active as ban_is_active,
  CASE
    WHEN NOT up.is_active THEN FALSE
    WHEN up.acknowledged THEN FALSE
    WHEN up.penalty_type = 'permanent' THEN TRUE
    WHEN up.suspended_until > NOW() THEN TRUE
    ELSE FALSE
  END as is_currently_banned,
  CASE
    WHEN NOT up.is_active THEN 'INACTIVE'
    WHEN up.acknowledged THEN 'ACKNOWLEDGED'
    WHEN up.penalty_type = 'permanent' THEN 'PERMANENT'
    WHEN up.suspended_until > NOW() THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as ban_status
FROM users u
INNER JOIN user_penalties up ON u.id = up.user_id
WHERE up.offense_number >= 6  -- Only show significant penalties (6th offense = permanent)

ORDER BY banned_at DESC;

-- Grant access to authenticated users (admins only via RLS)
GRANT SELECT ON admin_all_banned_users TO authenticated;

-- Add comment (removed security_barrier setting for better performance)
COMMENT ON VIEW admin_all_banned_users IS 
  'Unified view showing both manual admin bans and automatic penalty bans. 
   Includes all relevant details: ban source, reason, duration, and admin who imposed it.
   Use this for the admin dashboard Banned Users tab.';

-- Verify view was created
SELECT 
  '=== VIEW CREATED SUCCESSFULLY ===' as status,
  'Query admin_all_banned_users to see all banned users' as usage;

-- Show sample data
SELECT 
  ban_source,
  COUNT(*) as count,
  SUM(CASE WHEN is_currently_banned THEN 1 ELSE 0 END) as currently_banned
FROM admin_all_banned_users
GROUP BY ban_source;

-- Example queries for BannedUsersPanel.tsx:
/*

-- Get all currently banned users
SELECT * FROM admin_all_banned_users
WHERE is_currently_banned = TRUE
ORDER BY banned_at DESC;

-- Filter by ban source
SELECT * FROM admin_all_banned_users
WHERE ban_source = 'MANUAL' AND is_currently_banned = TRUE;

SELECT * FROM admin_all_banned_users
WHERE ban_source = 'AUTO_PENALTY' AND is_currently_banned = TRUE;

-- Get ban statistics
SELECT 
  ban_source,
  ban_type,
  COUNT(*) as total_bans,
  SUM(CASE WHEN is_currently_banned THEN 1 ELSE 0 END) as active_bans
FROM admin_all_banned_users
GROUP BY ban_source, ban_type;

*/
