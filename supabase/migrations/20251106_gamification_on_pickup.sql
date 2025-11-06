-- ============================================
-- Update Gamification to Trigger on PICKUP (not reservation)
-- Created: 2025-11-06
-- ============================================

-- ============================================
-- 1. REMOVE OLD TRIGGER (reservation-based)
-- ============================================

DROP TRIGGER IF EXISTS update_stats_on_reservation ON reservations;

-- ============================================
-- 2. CREATE NEW FUNCTION FOR PICKUP-BASED STATS
-- ============================================

CREATE OR REPLACE FUNCTION update_user_stats_on_pickup()
RETURNS TRIGGER AS $$
DECLARE
  v_money_saved DECIMAL(10, 2);
  v_offer_category TEXT;
  v_pickup_date DATE;
BEGIN
  -- Only proceed if status changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  -- Use the actual pickup date, not current date
  v_pickup_date := COALESCE(NEW.picked_up_at::DATE, CURRENT_DATE);

  -- Calculate money saved from the offer
  SELECT
    (o.original_price - o.smart_price) * NEW.quantity,
    o.category
  INTO v_money_saved, v_offer_category
  FROM offers o
  WHERE o.id = NEW.offer_id;

  -- Update user stats
  UPDATE user_stats
  SET
    total_reservations = total_reservations + 1,
    total_money_saved = total_money_saved + COALESCE(v_money_saved, 0),
    last_activity_date = v_pickup_date,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  -- Update streak based on pickup date
  PERFORM update_user_streak_on_date(NEW.user_id, v_pickup_date);

  -- Check for achievements
  PERFORM check_user_achievements(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. CREATE NEW STREAK FUNCTION WITH DATE PARAMETER
-- ============================================

CREATE OR REPLACE FUNCTION update_user_streak_on_date(p_user_id UUID, p_activity_date DATE)
RETURNS VOID AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INT;
  v_longest_streak INT;
  v_previous_streak INT;
BEGIN
  SELECT last_activity_date, current_streak_days, longest_streak_days
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_stats
  WHERE user_id = p_user_id;

  -- Store previous streak for bonus checking
  v_previous_streak := v_current_streak;

  -- Check if activity is on the same date
  IF v_last_activity = p_activity_date THEN
    -- Already counted for this date
    RETURN;
  END IF;

  -- Check if activity was on previous day (continue streak)
  IF v_last_activity = p_activity_date - INTERVAL '1 day' THEN
    v_current_streak := v_current_streak + 1;
  -- Check if gap is more than 1 day (reset streak)
  ELSIF v_last_activity < p_activity_date - INTERVAL '1 day' OR v_last_activity IS NULL THEN
    v_current_streak := 1;
  ELSE
    v_current_streak := 1;
  END IF;

  -- Update longest streak if current exceeds it
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- Update user_stats
  UPDATE user_stats
  SET
    current_streak_days = v_current_streak,
    longest_streak_days = v_longest_streak,
    last_activity_date = p_activity_date,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Award streak milestone bonuses (SEPARATE from achievements)
  -- 3-day streak bonus
  IF v_current_streak = 3 AND v_previous_streak < 3 THEN
    PERFORM add_user_points(
      p_user_id,
      20,
      'streak_bonus',
      jsonb_build_object('streak_days', 3, 'bonus_type', '3_day_streak')
    );
  END IF;

  -- 7-day streak bonus
  IF v_current_streak = 7 AND v_previous_streak < 7 THEN
    PERFORM add_user_points(
      p_user_id,
      50,
      'streak_bonus',
      jsonb_build_object('streak_days', 7, 'bonus_type', '7_day_streak')
    );
  END IF;

  -- 30-day streak bonus
  IF v_current_streak = 30 AND v_previous_streak < 30 THEN
    PERFORM add_user_points(
      p_user_id,
      200,
      'streak_bonus',
      jsonb_build_object('streak_days', 30, 'bonus_type', '30_day_streak')
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. CREATE TRIGGER FOR PICKUP-BASED GAMIFICATION
-- ============================================

CREATE TRIGGER update_stats_on_pickup
  AFTER UPDATE ON reservations
  FOR EACH ROW
  WHEN (NEW.status = 'PICKED_UP' AND OLD.status != 'PICKED_UP')
  EXECUTE FUNCTION update_user_stats_on_pickup();

-- ============================================
-- 5. GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION update_user_stats_on_pickup TO service_role;
GRANT EXECUTE ON FUNCTION update_user_streak_on_date TO service_role;

-- ============================================
-- 6. ADD COMMENT
-- ============================================

COMMENT ON FUNCTION update_user_stats_on_pickup IS 'Updates user gamification stats when partner marks reservation as picked up';
COMMENT ON FUNCTION update_user_streak_on_date IS 'Updates user streak based on specific activity date (pickup date), awards streak bonuses: 3-day (20pts), 7-day (50pts), 30-day (200pts)';
COMMENT ON TRIGGER update_stats_on_pickup ON reservations IS 'Triggers gamification updates when reservation status changes to PICKED_UP';
