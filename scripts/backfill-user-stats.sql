-- ============================================
-- Backfill User Stats for Existing Users
-- Run this AFTER running the gamification migration
-- ============================================

-- This script:
-- 1. Creates user_stats for any users who don't have them
-- 2. Calculates real stats from existing reservations
-- 3. Updates money saved totals
-- 4. Does NOT calculate streaks (too complex for backfill)

-- ============================================
-- Step 1: Create missing user_stats rows
-- ============================================
INSERT INTO user_stats (user_id, last_activity_date, created_at)
SELECT
  u.id,
  COALESCE(MAX(r.created_at::date), CURRENT_DATE),
  u.created_at
FROM users u
LEFT JOIN reservations r ON u.id = r.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM user_stats us WHERE us.user_id = u.id
)
GROUP BY u.id, u.created_at;

-- ============================================
-- Step 2: Backfill reservation counts
-- ============================================
UPDATE user_stats us
SET
  total_reservations = (
    SELECT COUNT(*)
    FROM reservations r
    WHERE r.user_id = us.user_id
      AND r.status IN ('CONFIRMED', 'COMPLETED')
  ),
  updated_at = now();

-- ============================================
-- Step 3: Backfill money saved
-- ============================================
UPDATE user_stats us
SET
  total_money_saved = COALESCE((
    SELECT SUM((o.original_price - o.smart_price) * r.quantity)
    FROM reservations r
    JOIN offers o ON r.offer_id = o.id
    WHERE r.user_id = us.user_id
      AND r.status IN ('CONFIRMED', 'COMPLETED')
  ), 0),
  updated_at = now();

-- ============================================
-- Step 4: Check for achievements
-- (This will award achievements based on current stats)
-- ============================================
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT user_id FROM user_stats WHERE total_reservations > 0
  LOOP
    PERFORM check_user_achievements(user_record.user_id);
  END LOOP;
END $$;

-- ============================================
-- Step 5: Verify results
-- ============================================
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE total_reservations > 0) as users_with_reservations,
  SUM(total_reservations) as total_reservations,
  SUM(total_money_saved) as total_money_saved
FROM user_stats;

-- ============================================
-- DONE!
-- ============================================
SELECT 'Backfill complete! Check your profile page.' as message;
