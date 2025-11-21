-- ============================================
-- ADD MISSING COLUMNS TO user_stats
-- Date: 2025-11-11
-- ============================================
-- Adds columns needed for achievement tracking
-- Run BEFORE 20251111_backfill_user_stats.sql

-- Add last_activity_date if missing (should exist but adding for safety)
ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- Add category tracking (for breakfast/dinner/dessert achievements)
ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS category_counts JSONB DEFAULT '{}'::jsonb;

-- Add partner tracking (for explorer and loyalty achievements)
ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS partner_visit_counts JSONB DEFAULT '{}'::jsonb;

ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS unique_partners_visited INT DEFAULT 0;

-- Ensure other standard columns exist
ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS total_reservations INT DEFAULT 0;

ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS total_money_saved DECIMAL(10, 2) DEFAULT 0.00;

ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS current_streak_days INT DEFAULT 0;

ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS longest_streak_days INT DEFAULT 0;

ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS total_referrals INT DEFAULT 0;

ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_category_counts ON user_stats USING GIN (category_counts);
CREATE INDEX IF NOT EXISTS idx_user_stats_partner_counts ON user_stats USING GIN (partner_visit_counts);

-- Verify columns were added
DO $$
BEGIN
  RAISE NOTICE '✅ user_stats columns added successfully!';
  RAISE NOTICE 'Columns now include:';
  RAISE NOTICE '  • last_activity_date (DATE) - last pickup date';
  RAISE NOTICE '  • category_counts (JSONB) - tracks breakfast/dinner/dessert orders';
  RAISE NOTICE '  • partner_visit_counts (JSONB) - tracks visits per partner';
  RAISE NOTICE '  • unique_partners_visited (INT) - count of unique partners';
  RAISE NOTICE '  • total_reservations (INT) - total pickups';
  RAISE NOTICE '  • total_money_saved (DECIMAL) - total savings';
  RAISE NOTICE '  • current_streak_days (INT) - current streak';
  RAISE NOTICE '  • longest_streak_days (INT) - best streak';
  RAISE NOTICE '  • total_referrals (INT) - referrals count';
END $$;
