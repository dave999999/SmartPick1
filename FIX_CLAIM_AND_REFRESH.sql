-- ================================================
-- FIX: Achievement Claim + MyPicks Refresh
-- Run this in Supabase SQL Editor
-- ================================================

BEGIN;

-- ================================================
-- PART 1: Fix Achievement Claim
-- ================================================

-- Simple claim function that directly updates user_points
CREATE OR REPLACE FUNCTION claim_achievement(p_achievement_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_def achievement_definitions%ROWTYPE;
  v_row user_achievements%ROWTYPE;
  v_current_balance INT;
  v_new_balance INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the achievement
  SELECT * INTO v_row FROM user_achievements
  WHERE user_id = v_user_id AND achievement_id = p_achievement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not unlocked';
  END IF;

  -- Check if already claimed
  IF v_row.reward_claimed THEN
    RETURN jsonb_build_object(
      'success', true, 
      'awarded_now', false,
      'reward_points', 0,
      'message', 'Already claimed'
    );
  END IF;

  -- Get achievement details
  SELECT * INTO v_def FROM achievement_definitions WHERE id = p_achievement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement definition missing';
  END IF;

  -- Award points directly
  SELECT COALESCE(balance, 0) INTO v_current_balance
  FROM user_points
  WHERE user_id = v_user_id;

  v_new_balance := COALESCE(v_current_balance, 0) + v_def.reward_points;

  -- Update or insert user_points
  INSERT INTO user_points (user_id, balance)
  VALUES (v_user_id, v_new_balance)
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = v_new_balance;

  -- Record transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (
    v_user_id,
    v_def.reward_points,
    'ACHIEVEMENT',
    COALESCE(v_current_balance, 0),
    v_new_balance,
    jsonb_build_object(
      'achievement_id', p_achievement_id,
      'achievement_name', v_def.name
    )
  );

  -- Mark as claimed
  UPDATE user_achievements
  SET reward_claimed = true,
      reward_claimed_at = NOW(),
      points_awarded = v_def.reward_points,
      is_new = false,
      viewed_at = COALESCE(viewed_at, NOW())
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'success', true,
    'awarded_now', true,
    'reward_points', v_def.reward_points,
    'balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION claim_achievement(TEXT) TO authenticated;

COMMIT;

-- Test
SELECT 'Achievement claim function updated!' as status;
