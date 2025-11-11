-- ============================================
-- UPDATE check_user_achievements FOR CLAIM FLOW
-- Date: 2025-11-11
-- ============================================
-- Updates the achievement checking function to support manual claim flow
-- Achievements unlock but don't auto-award points (user must claim)

CREATE OR REPLACE FUNCTION check_user_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_achievement RECORD;
  v_stats RECORD;
  v_already_has BOOLEAN;
  v_requirement_type TEXT;
  v_category_name TEXT;
  v_category_count INTEGER;
  v_max_partner_visits INTEGER;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
  IF NOT FOUND THEN 
    RAISE NOTICE 'No user_stats for user %', p_user_id;
    RETURN; 
  END IF;

  -- Loop through all active achievements
  FOR v_achievement IN 
    SELECT * FROM achievement_definitions WHERE is_active = true 
  LOOP
    -- Check if user already has this achievement
    SELECT EXISTS(
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_has;
    
    IF v_already_has THEN 
      CONTINUE; 
    END IF;

    -- Get requirement type
    v_requirement_type := v_achievement.requirement->>'type';

    -- Check if requirement is met based on type
    IF v_requirement_type = 'reservations' THEN
      IF v_stats.total_reservations >= (v_achievement.requirement->>'count')::INT THEN
        -- Unlock achievement (reward_claimed = false by default)
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false)
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        RAISE NOTICE 'Achievement unlocked: % (must claim to get % points)', v_achievement.name, v_achievement.reward_points;
      END IF;

    ELSIF v_requirement_type = 'money_saved' THEN
      IF v_stats.total_money_saved >= (v_achievement.requirement->>'amount')::DECIMAL THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false)
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        RAISE NOTICE 'Achievement unlocked: % (must claim to get % points)', v_achievement.name, v_achievement.reward_points;
      END IF;

    ELSIF v_requirement_type = 'category' THEN
      v_category_name := v_achievement.requirement->>'name';
      v_category_count := COALESCE((v_stats.category_counts->>v_category_name)::INT, 0);
      IF v_category_count >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false)
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        RAISE NOTICE 'Achievement unlocked: % (must claim to get % points)', v_achievement.name, v_achievement.reward_points;
      END IF;

    ELSIF v_requirement_type = 'unique_partners' THEN
      IF v_stats.unique_partners_visited >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false)
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        RAISE NOTICE 'Achievement unlocked: % (must claim to get % points)', v_achievement.name, v_achievement.reward_points;
      END IF;

    ELSIF v_requirement_type = 'partner_loyalty' THEN
      -- Find the partner with most visits
      SELECT MAX((value)::INT) INTO v_max_partner_visits 
      FROM jsonb_each_text(v_stats.partner_visit_counts);
      
      IF COALESCE(v_max_partner_visits, 0) >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false)
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        RAISE NOTICE 'Achievement unlocked: % (must claim to get % points)', v_achievement.name, v_achievement.reward_points;
      END IF;

    ELSIF v_requirement_type = 'streak' THEN
      IF v_stats.current_streak_days >= (v_achievement.requirement->>'days')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false)
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        RAISE NOTICE 'Achievement unlocked: % (must claim to get % points)', v_achievement.name, v_achievement.reward_points;
      END IF;

    ELSIF v_requirement_type = 'referrals' THEN
      IF v_stats.total_referrals >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new, reward_claimed)
        VALUES (p_user_id, v_achievement.id, true, false)
        ON CONFLICT (user_id, achievement_id) DO NOTHING;
        RAISE NOTICE 'Achievement unlocked: % (must claim to get % points)', v_achievement.name, v_achievement.reward_points;
      END IF;
    END IF;

  END LOOP;

  RAISE NOTICE 'Finished checking achievements for user %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_achievements_user_id_achievement_id_key'
  ) THEN
    ALTER TABLE user_achievements 
    ADD CONSTRAINT user_achievements_user_id_achievement_id_key 
    UNIQUE (user_id, achievement_id);
  END IF;
END $$;

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ check_user_achievements() updated for manual claim flow';
  RAISE NOTICE '✅ Achievements unlock with reward_claimed=false';
  RAISE NOTICE '✅ Users must click "Claim Reward" to get points';
END $$;
