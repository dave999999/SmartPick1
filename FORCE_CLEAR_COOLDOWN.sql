-- FORCE CLEAR ALL COOLDOWNS AND CHECK STATUS

-- 1. Delete ALL cancellations (not just today)
DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- 2. Delete ALL cooldown lifts
DELETE FROM user_cooldown_lifts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- 3. Verify cooldown is now FALSE
SELECT 
  'COOLDOWN STATUS' as check,
  in_cooldown,
  cooldown_until,
  cancellation_count,
  reset_count
FROM is_user_in_cooldown(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
);

-- 4. Verify penalty is still active
SELECT 
  'PENALTY STATUS' as check,
  offense_number,
  penalty_type,
  suspended_until,
  can_lift_with_points,
  points_required
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND is_active = TRUE
ORDER BY created_at DESC
LIMIT 1;

-- ✅ After running this, HARD REFRESH (Ctrl+Shift+R) 
-- You should see the 2nd missed pickup suspension modal!
