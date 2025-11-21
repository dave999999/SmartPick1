-- ============================================
-- APPLY THESE MIGRATIONS IN ORDER
-- Date: 2025-11-11
-- ============================================
-- Run these in Supabase SQL Editor, one at a time, in this exact order:

-- ============================================
-- STEP 1: Add Missing Columns to user_stats
-- ============================================
-- File: 20251111_add_user_stats_columns.sql
-- This adds category_counts, partner_visit_counts, unique_partners_visited
-- REQUIRED before other migrations!

-- Copy and paste the ENTIRE content of:
-- supabase/migrations/20251111_add_user_stats_columns.sql

-- Expected output:
-- ✅ user_stats columns added successfully!
-- Columns now include:
--   • category_counts (JSONB) - tracks breakfast/dinner/dessert orders
--   • partner_visit_counts (JSONB) - tracks visits per partner
--   • unique_partners_visited (INT) - count of unique partners

-- ============================================
-- STEP 2: Fix Achievement Tracking (if not already applied)
-- ============================================
-- File: 20251111_fix_achievement_tracking.sql
-- This fixes the trigger to use customer_id instead of user_id
-- (Already applied if pickups are working)

-- ============================================
-- STEP 3: Create 48 Achievements
-- ============================================
-- File: 20251111_cleanup_achievements.sql
-- This creates all 48 achievements in the database
-- WITHOUT THIS, THERE ARE NO ACHIEVEMENTS TO TRACK!

-- Copy and paste the ENTIRE content of:
-- supabase/migrations/20251111_cleanup_achievements.sql

-- Expected output:
-- ✅ 48-Achievement System Created!
-- 📊 Achievement Breakdown:
--    • Total Achievements: 48
--    • Milestone: 12 achievements
--    • Savings: 8 achievements
--    • Engagement: 22 achievements
--    • Social: 6 achievements
--    • Total Points Available: 18785

-- ============================================
-- STEP 4: Backfill Existing User Stats
-- ============================================
-- File: 20251111_backfill_user_stats.sql
-- This recalculates stats from existing picked-up reservations
-- Awards achievements retroactively

-- Copy and paste the ENTIRE content of:
-- supabase/migrations/20251111_backfill_user_stats.sql

-- Expected output:
-- 🚀 Starting user stats backfill...
-- 👥 Found X users with picked up reservations
-- Progress: X/X (100%)
-- ✅ Backfill complete!
-- 📊 Summary:
--    • Users processed: X
--    • Stats updated: X
--    • Achievements unlocked: X

-- ============================================
-- VERIFICATION
-- ============================================

-- After applying all migrations, run these queries:

-- 1. Check achievements were created
SELECT COUNT(*) as total_achievements 
FROM achievement_definitions 
WHERE is_active = true;
-- Expected: 48

-- 2. Check your user stats
SELECT 
  u.name,
  us.total_reservations,
  us.total_money_saved,
  us.current_streak_days,
  (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) as achievements_unlocked
FROM users u
LEFT JOIN user_stats us ON us.user_id = u.id
WHERE u.is_partner = true  -- Or use your user_id
LIMIT 5;

-- 3. Check unlocked achievements
SELECT 
  ad.name,
  ad.icon,
  ad.category,
  ad.reward_points,
  ua.unlocked_at
FROM user_achievements ua
JOIN achievement_definitions ad ON ad.id = ua.achievement_id
WHERE ua.user_id = 'YOUR-USER-ID-HERE'  -- Replace with your user_id
ORDER BY ua.unlocked_at DESC;

-- 4. Test new pickup
-- Make another pickup and check if "First Pick" or next achievement unlocks

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If achievements still don't show:

-- A. Check if achievement_definitions is populated:
SELECT category, COUNT(*) as count
FROM achievement_definitions
WHERE is_active = true
GROUP BY category;
-- Should show: milestone(12), savings(8), engagement(22), social(6)

-- B. Check if user_achievements table exists:
SELECT COUNT(*) FROM user_achievements;

-- C. Manually trigger achievement check for your user:
SELECT check_user_achievements('YOUR-USER-ID-HERE');

-- D. Check logs after pickup:
-- Go to Supabase Dashboard → Logs
-- Look for: "✅ Achievements checked" or "⚠️ Failed to check achievements"
