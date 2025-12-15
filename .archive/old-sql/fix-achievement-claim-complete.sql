-- STEP 1: First, let's check your current achievements status
SELECT 
    ad.achievement_id,
    ad.title,
    ad.requirements,
    CASE 
        WHEN ua.achievement_id IS NOT NULL THEN 'Unlocked'
        ELSE 'Not Unlocked'
    END as status,
    ua.unlocked_at,
    ua.reward_claimed
FROM achievement_definitions ad
LEFT JOIN user_achievements ua ON ad.achievement_id = ua.achievement_id 
    AND ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
WHERE ad.achievement_id LIKE '%penny%'
ORDER BY ad.achievement_id;

-- STEP 2: Check your actual stats to see if you meet the requirements
SELECT 
    user_id,
    total_offers_viewed,
    total_purchases,
    points_earned,
    points_spent,
    current_points
FROM user_stats
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- STEP 3: Manually unlock the achievement if it's not unlocked
-- (Run this only if the achievement shows "Not Unlocked" above)
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, reward_claimed)
VALUES (
    'ed0d1c67-07b7-4901-852d-7130dd5368ab',
    'penny_pincher_1',
    NOW(),
    false
)
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- STEP 4: Now verify the claim_achievement function exists and try to update it
CREATE OR REPLACE FUNCTION public.claim_achievement(p_achievement_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_row user_achievements%ROWTYPE;
  v_points INTEGER;
  v_result JSONB;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try to auto-unlock achievements first
  BEGIN
    PERFORM check_user_achievements(v_user_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to auto-check achievements: %', SQLERRM;
  END;

  -- Get the achievement record with lock
  SELECT * INTO v_row 
  FROM user_achievements
  WHERE user_id = v_user_id 
    AND achievement_id = p_achievement_id
  FOR UPDATE;

  -- Check if achievement exists and is unlocked
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not unlocked for this user' USING ERRCODE = 'P0001';
  END IF;

  -- Check if already claimed
  IF v_row.reward_claimed THEN
    RAISE EXCEPTION 'Achievement reward already claimed' USING ERRCODE = 'P0002';
  END IF;

  -- Get points value
  SELECT points_reward INTO v_points
  FROM achievement_definitions
  WHERE achievement_id = p_achievement_id;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Achievement not found in definitions';
  END IF;

  -- Update achievement as claimed
  UPDATE user_achievements
  SET reward_claimed = true,
      claimed_at = NOW()
  WHERE user_id = v_user_id 
    AND achievement_id = p_achievement_id;

  -- Add points via transaction
  INSERT INTO point_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    related_entity_type,
    related_entity_id
  ) VALUES (
    v_user_id,
    v_points,
    'achievement_reward',
    'Claimed achievement: ' || p_achievement_id,
    'achievement',
    p_achievement_id
  );

  -- Update user stats
  UPDATE user_stats
  SET current_points = current_points + v_points,
      points_earned = points_earned + v_points,
      achievements_unlocked = (
        SELECT COUNT(*) FROM user_achievements 
        WHERE user_id = v_user_id
      )
  WHERE user_id = v_user_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'achievement_id', p_achievement_id
  );

  RETURN v_result;
END;
$$;
