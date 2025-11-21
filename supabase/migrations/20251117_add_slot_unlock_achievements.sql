-- =====================================================
-- Migration: Add Reservation Slot Unlock Achievements
-- Date: 2025-11-17
-- Description: Adds "Bulk Buyer" (5 slots) and "Maximum Capacity" (10 slots) achievements
-- =====================================================

-- Insert "Bulk Buyer" Achievement (5 slots unlocked)
INSERT INTO achievement_definitions (
  id,
  name,
  description,
  icon,
  requirement,
  reward_points,
  tier,
  category,
  is_active,
  created_at
)
VALUES (
  'slot_unlock_5',
  'Bulk Buyer',
  'Unlock 5 reservation slots',
  '🛒',
  '{"type": "slot_unlock", "count": 5}'::jsonb,
  50, -- Bonus 50 points for reaching this milestone
  'bronze',
  'capacity',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  requirement = EXCLUDED.requirement,
  reward_points = EXCLUDED.reward_points;

-- Insert "Maximum Capacity" Achievement (10 slots unlocked - max)
INSERT INTO achievement_definitions (
  id,
  name,
  description,
  icon,
  requirement,
  reward_points,
  tier,
  category,
  is_active,
  created_at
)
VALUES (
  'slot_unlock_10',
  'Maximum Capacity',
  'Unlock all 10 reservation slots',
  '💎',
  '{"type": "slot_unlock", "count": 10}'::jsonb,
  200, -- Bigger bonus 200 points for maxing out!
  'diamond',
  'capacity',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  requirement = EXCLUDED.requirement,
  reward_points = EXCLUDED.reward_points;

-- =====================================================
-- Update check_user_achievements function to include slot unlock logic
-- =====================================================
CREATE OR REPLACE FUNCTION check_user_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_achievement RECORD;
  v_stats RECORD;
  v_user_max_slots INTEGER;
  v_already_has BOOLEAN;
  v_requirement_type TEXT;
  v_category_name TEXT;
  v_category_count INTEGER;
  v_max_partner_visits INTEGER;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Get user's current max slots
  SELECT max_reservation_quantity INTO v_user_max_slots FROM users WHERE id = p_user_id;
  v_user_max_slots := COALESCE(v_user_max_slots, 3); -- Default to 3

  FOR v_achievement IN SELECT * FROM achievement_definitions WHERE is_active = true LOOP
    SELECT EXISTS(
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_has;
    IF v_already_has THEN CONTINUE; END IF;

    v_requirement_type := v_achievement.requirement->>'type';

    -- SLOT UNLOCK ACHIEVEMENTS (NEW)
    IF v_requirement_type = 'slot_unlock' THEN
      IF v_user_max_slots >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false);
      END IF;

    -- EXISTING ACHIEVEMENT TYPES
    ELSIF v_requirement_type = 'reservations' THEN
      IF v_stats.total_reservations >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false);
      END IF;
    ELSIF v_requirement_type = 'money_saved' THEN
      IF v_stats.total_money_saved >= (v_achievement.requirement->>'amount')::DECIMAL THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false);
      END IF;
    ELSIF v_requirement_type = 'category' THEN
      v_category_name := v_achievement.requirement->>'name';
      v_category_count := COALESCE((v_stats.category_counts->>v_category_name)::INT, 0);
      IF v_category_count >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false);
      END IF;
    ELSIF v_requirement_type = 'unique_partners' THEN
      IF v_stats.unique_partners_visited >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false);
      END IF;
    ELSIF v_requirement_type = 'partner_loyalty' THEN
      SELECT MAX((value)::INT) INTO v_max_partner_visits FROM jsonb_each_text(v_stats.partner_visit_counts);
      IF COALESCE(v_max_partner_visits,0) >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false);
      END IF;
    ELSIF v_requirement_type = 'streak' THEN
      IF v_stats.current_streak_days >= (v_achievement.requirement->>'days')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false);
      END IF;
    ELSIF v_requirement_type = 'referrals' THEN
      IF v_stats.total_referrals >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false);
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Verification
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM achievement_definitions WHERE id = 'slot_unlock_5') AND
     EXISTS (SELECT 1 FROM achievement_definitions WHERE id = 'slot_unlock_10') THEN
    RAISE NOTICE '✅ Slot unlock achievements added successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to add slot unlock achievements';
  END IF;
END $$;

-- Display new achievements
SELECT 
  id,
  name,
  description,
  icon,
  requirement->>'type' as type,
  requirement->>'count' as count,
  reward_points,
  tier
FROM achievement_definitions 
WHERE id IN ('slot_unlock_5', 'slot_unlock_10');

