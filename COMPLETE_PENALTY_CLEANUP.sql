-- =====================================================
-- COMPLETE CLEANUP: Remove ALL Active Penalties
-- =====================================================

-- 1. Delete ALL penalties (not just specific types)
DELETE FROM user_penalties;

-- 2. Delete ALL cancellation tracking records (this is what counts the "2nd cancel")
DELETE FROM user_cancellation_tracking;

-- 3. Clear all user suspension flags
UPDATE users
SET is_suspended = false,
    suspended_until = NULL,
    current_penalty_level = 0,
    status = 'ACTIVE'
WHERE status = 'BANNED' OR is_suspended = true;

-- 4. Verify cleanup
SELECT 
  'Complete cleanup done!' as status,
  (SELECT COUNT(*) FROM user_penalties) as remaining_penalties,
  (SELECT COUNT(*) FROM user_cancellation_tracking) as remaining_cancellations,
  (SELECT COUNT(*) FROM users WHERE is_suspended = true) as suspended_users,
  (SELECT COUNT(*) FROM users WHERE status = 'BANNED') as banned_users;

SELECT '✅ COMPLETE CLEANUP DONE - All penalties, bans, and cancellation history cleared!' as result;
