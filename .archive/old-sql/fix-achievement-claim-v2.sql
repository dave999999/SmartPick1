-- STEP 1: Check what columns exist in achievement_definitions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'achievement_definitions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: Check what columns exist in user_achievements
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_achievements' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 3: Check your achievements (adjusted query)
SELECT 
    ad.id,
    ad.title,
    ad.requirements,
    CASE 
        WHEN ua.id IS NOT NULL THEN 'Unlocked'
        ELSE 'Not Unlocked'
    END as status,
    ua.unlocked_at,
    ua.reward_claimed
FROM achievement_definitions ad
LEFT JOIN user_achievements ua ON ad.id = ua.achievement_id 
    AND ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
WHERE ad.id LIKE '%penny%' OR ad.title ILIKE '%penny%'
ORDER BY ad.id;

-- STEP 4: Check your actual stats
SELECT 
    user_id,
    total_offers_viewed,
    total_purchases,
    points_earned,
    points_spent,
    current_points
FROM user_stats
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- STEP 5: Manually unlock the "Penny Pincher" achievement
-- First, let's find the exact achievement ID
SELECT id, title, description, requirements, points_reward
FROM achievement_definitions
WHERE title ILIKE '%penny%';

-- STEP 6: Insert into user_achievements (replace 'penny_pincher_1' with actual ID from above)
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, reward_claimed)
VALUES (
    'ed0d1c67-07b7-4901-852d-7130dd5368ab',
    'penny_pincher_1',  -- Replace this with the actual ID from STEP 5 if different
    NOW(),
    false
)
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- STEP 7: Update the claim_achievement function
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
  WHERE id = p_achievement_id;

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
