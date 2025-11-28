-- ============================================
-- Achievement Claim Flow
-- - Adds claimed state to user_achievements
-- - Stops auto-award in check_user_achievements (points granted on claim)
-- - Adds secure claim_achievement() RPC using auth.uid()
-- ============================================

-- 1) Extend user_achievements with claim fields
ALTER TABLE user_achievements
  ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reward_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS points_awarded INT DEFAULT 0;

-- 2) Replace check_user_achievements to NOT auto-award points
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
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_achievement IN SELECT * FROM achievement_definitions WHERE is_active = true LOOP
    SELECT EXISTS(
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_has;
    IF v_already_has THEN CONTINUE; END IF;

    v_requirement_type := v_achievement.requirement->>'type';

    IF v_requirement_type = 'reservations' THEN
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

-- 3) Claim RPC (secure via auth.uid())
CREATE OR REPLACE FUNCTION claim_achievement(p_achievement_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_def achievement_definitions%ROWTYPE;
  v_row user_achievements%ROWTYPE;
  v_tx JSONB;
  v_already_awarded BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Auto-check achievements first to unlock if requirements are met
  BEGIN
    PERFORM check_user_achievements(v_user_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to check achievements: %', SQLERRM;
  END;

  SELECT * INTO v_row FROM user_achievements
  WHERE user_id = v_user_id AND achievement_id = p_achievement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not unlocked for this user';
  END IF;

  IF v_row.reward_claimed THEN
    RETURN jsonb_build_object('success', true, 'already_claimed', true);
  END IF;

  SELECT * INTO v_def FROM achievement_definitions WHERE id = p_achievement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement definition missing';
  END IF;

  -- Check if previously auto-awarded (older versions)
  PERFORM 1 FROM point_transactions
  WHERE user_id = v_user_id
    AND reason = 'achievement'
    AND metadata->>'achievement_id' = p_achievement_id
  LIMIT 1;
  v_already_awarded := FOUND;

  IF NOT v_already_awarded AND v_def.reward_points > 0 THEN
    v_tx := add_user_points(v_user_id, v_def.reward_points, 'achievement', jsonb_build_object('achievement_id', p_achievement_id, 'achievement_name', v_def.name));
  END IF;

  UPDATE user_achievements
  SET reward_claimed = true,
      reward_claimed_at = NOW(),
      points_awarded = CASE WHEN v_already_awarded THEN points_awarded ELSE v_def.reward_points END,
      is_new = false,
      viewed_at = COALESCE(viewed_at, NOW())
  WHERE id = v_row.id;

  RETURN jsonb_build_object('success', true, 'awarded_now', NOT v_already_awarded, 'reward_points', v_def.reward_points, 'balance', COALESCE(v_tx->>'balance','') );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION claim_achievement TO anon;
GRANT EXECUTE ON FUNCTION claim_achievement TO authenticated;
