-- Quick fix for achievement claim - Run all of this at once

-- STEP 1: Find the Penny Pincher achievement
SELECT id, name, description, requirement, reward_points
FROM achievement_definitions
WHERE name ILIKE '%penny%' OR description ILIKE '%penny%';

-- STEP 2: Check if it's already unlocked for you
SELECT 
    ad.id,
    ad.name,
    ad.requirement,
    CASE 
        WHEN ua.id IS NOT NULL THEN 'Unlocked'
        ELSE 'Not Unlocked'
    END as status,
    ua.reward_claimed
FROM achievement_definitions ad
LEFT JOIN user_achievements ua ON ad.id = ua.achievement_id 
    AND ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
WHERE ad.name ILIKE '%penny%';

-- STEP 3: Check your stats
SELECT 
    total_offers_viewed,
    total_purchases,
    points_earned,
    points_spent,
    current_points
FROM user_stats
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- STEP 4: Manually unlock the achievement (safe - does nothing if already unlocked)
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, reward_claimed)
SELECT 
    'ed0d1c67-07b7-4901-852d-7130dd5368ab',
    id,
    NOW(),
    false
FROM achievement_definitions
WHERE name ILIKE '%penny%'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- STEP 5: Update the claim function with auto-unlock
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
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Auto-unlock achievements first
  BEGIN
    PERFORM check_user_achievements(v_user_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to auto-check: %', SQLERRM;
  END;

  -- Get achievement
  SELECT * INTO v_row 
  FROM user_achievements
  WHERE user_id = v_user_id 
    AND achievement_id = p_achievement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not unlocked for this user' USING ERRCODE = 'P0001';
  END IF;

  IF v_row.reward_claimed THEN
    RAISE EXCEPTION 'Achievement reward already claimed' USING ERRCODE = 'P0002';
  END IF;

  -- Get points
  SELECT reward_points INTO v_points
  FROM achievement_definitions
  WHERE id = p_achievement_id;

  -- Claim it
  UPDATE user_achievements
  SET reward_claimed = true,
      claimed_at = NOW()
  WHERE user_id = v_user_id 
    AND achievement_id = p_achievement_id;

  -- Add points
  INSERT INTO point_transactions (
    user_id, amount, transaction_type, description,
    related_entity_type, related_entity_id
  ) VALUES (
    v_user_id, v_points, 'achievement_reward',
    'Claimed: ' || p_achievement_id,
    'achievement', p_achievement_id
  );

  -- Update stats
  UPDATE user_stats
  SET current_points = current_points + v_points,
      points_earned = points_earned + v_points
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'achievement_id', p_achievement_id
  );
END;
$$;

-- STEP 6: Verify it worked
SELECT 
    ad.name,
    ua.reward_claimed,
    ua.unlocked_at
FROM achievement_definitions ad
JOIN user_achievements ua ON ad.id = ua.achievement_id
WHERE ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
  AND ad.name ILIKE '%penny%';
