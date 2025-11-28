-- Fix claim_achievement to auto-unlock achievements before claiming
-- This allows users to claim achievements that meet requirements but haven't been auto-unlocked yet

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
