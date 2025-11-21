-- ============================================
-- FIX: Remove Duplicate/Old Triggers Causing Point Issues
-- Created: 2025-11-06
-- ============================================

-- ISSUE: Multiple triggers may be firing, causing duplicate point deductions
-- or incorrect point calculations based on quantity

-- ============================================
-- 1. REMOVE ALL OLD RESERVATION TRIGGERS
-- ============================================

-- Drop the OLD trigger that updates stats on reservation creation
-- This should have been removed but might still exist
DROP TRIGGER IF EXISTS update_stats_on_reservation ON reservations;

-- Drop any other potential duplicate triggers
DROP TRIGGER IF EXISTS update_user_stats_on_reservation_trigger ON reservations;
DROP TRIGGER IF EXISTS gamification_on_reservation ON reservations;

-- ============================================
-- 2. VERIFY ONLY PICKUP TRIGGER EXISTS
-- ============================================

-- The ONLY trigger on reservations table should be:
-- update_stats_on_pickup (which fires on status = 'PICKED_UP')

-- Verify it exists and recreate if needed
DROP TRIGGER IF EXISTS update_stats_on_pickup ON reservations;

CREATE TRIGGER update_stats_on_pickup
  AFTER UPDATE ON reservations
  FOR EACH ROW
  WHEN (NEW.status = 'PICKED_UP' AND OLD.status != 'PICKED_UP')
  EXECUTE FUNCTION update_user_stats_on_pickup();

-- ============================================
-- 3. ADD COMMENTS FOR CLARITY
-- ============================================

COMMENT ON TRIGGER update_stats_on_pickup ON reservations IS
  'ONLY trigger on reservations - fires when partner marks order as picked up. Updates gamification stats and awards streak bonuses.';

-- ============================================
-- 4. VERIFY NO POINT DEDUCTION IN TRIGGERS
-- ============================================

-- IMPORTANT: Triggers should NOT deduct points directly!
-- Points are deducted in the frontend BEFORE creating reservation
-- via deductPoints() function call

-- Gamification triggers should ONLY:
-- 1. Update user_stats (total_reservations, money_saved, etc.)
-- 2. Calculate streaks
-- 3. Check achievements
-- 4. Award streak BONUSES (additional points for milestones)

-- ============================================
-- DONE
-- ============================================

-- After running this migration:
-- - Old triggers removed
-- - Only pickup trigger remains
-- - Point deduction should be exactly 5 per reservation (regardless of quantity)
