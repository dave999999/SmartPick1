-- =====================================================
-- FIX: Add system flag to claim_achievement so points are actually awarded
-- =====================================================
-- Problem: Achievement rewards not adding points
-- Cause: add_user_points requires app.is_system_operation flag
-- Solution: Set flag in claim_achievement before calling add_user_points
-- =====================================================

DROP FUNCTION IF EXISTS public.claim_achievement(TEXT);

CREATE OR REPLACE FUNCTION public.claim_achievement(p_achievement_id TEXT)
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
    -- SET SYSTEM FLAG SO add_user_points WORKS
    PERFORM set_config('app.is_system_operation', 'true', true);
    
    v_tx := add_user_points(
      v_user_id, 
      v_def.reward_points, 
      'achievement', 
      jsonb_build_object(
        'achievement_id', p_achievement_id, 
        'achievement_name', v_def.name
      )
    );
  END IF;

  UPDATE user_achievements
  SET reward_claimed = true,
      reward_claimed_at = NOW(),
      points_awarded = CASE WHEN v_already_awarded THEN points_awarded ELSE v_def.reward_points END,
      is_new = false,
      viewed_at = COALESCE(viewed_at, NOW())
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'success', true, 
    'awarded_now', NOT v_already_awarded, 
    'reward_points', v_def.reward_points, 
    'balance', COALESCE(v_tx->>'balance', '0')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.claim_achievement TO authenticated;

COMMENT ON FUNCTION public.claim_achievement IS 
'Claims achievement reward and adds points to user balance. Sets system flag for add_user_points. Auto-unlocks achievements before claiming.';

SELECT '✅ Fixed: claim_achievement now sets system flag to award points' as status;
