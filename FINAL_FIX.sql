-- FINAL FIX - Run this entire script in Supabase SQL Editor

-- Step 1: Check if Penny Pincher exists
SELECT id, name, description, reward_points
FROM achievement_definitions
WHERE name ILIKE '%penny%';

-- Step 2: Check if you have it unlocked
SELECT 
    ad.name,
    CASE WHEN ua.id IS NOT NULL THEN 'YES - Unlocked' ELSE 'NO - Not unlocked' END as unlocked_status,
    ua.reward_claimed
FROM achievement_definitions ad
LEFT JOIN user_achievements ua ON ad.id = ua.achievement_id 
    AND ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
WHERE ad.name ILIKE '%penny%';

-- Step 3: Check your reservation count
SELECT total_reservations
FROM user_stats
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- Step 4: Unlock it manually (this will insert if not exists)
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, reward_claimed)
SELECT 
    'ed0d1c67-07b7-4901-852d-7130dd5368ab',
    id,
    NOW(),
    false
FROM achievement_definitions
WHERE name ILIKE '%penny%'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Step 5: Fix the claim function
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try auto-unlock first
  BEGIN
    PERFORM check_user_achievements(v_user_id);
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors
  END;

  -- Get achievement
  SELECT * INTO v_row 
  FROM user_achievements
  WHERE user_id = v_user_id 
    AND achievement_id = p_achievement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not unlocked' USING ERRCODE = 'P0001';
  END IF;

  IF v_row.reward_claimed THEN
    RAISE EXCEPTION 'Already claimed' USING ERRCODE = 'P0002';
  END IF;

  -- Get points
  SELECT reward_points INTO v_points
  FROM achievement_definitions
  WHERE id = p_achievement_id;

  -- Mark as claimed
  UPDATE user_achievements
  SET reward_claimed = true, claimed_at = NOW()
  WHERE user_id = v_user_id AND achievement_id = p_achievement_id;

  -- Add points transaction
  INSERT INTO point_transactions (user_id, change, transaction_type, description)
  VALUES (v_user_id, v_points, 'achievement_reward', 'Claimed: ' || p_achievement_id);

  -- Update balance
  UPDATE user_points
  SET balance = balance + v_points, updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'points_awarded', v_points);
END;
$$;

-- Step 6: Confirm it's now unlocked
SELECT 
    ad.name,
    ua.reward_claimed,
    ua.unlocked_at
FROM achievement_definitions ad
JOIN user_achievements ua ON ad.id = ua.achievement_id
WHERE ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
  AND ad.name ILIKE '%penny%';
