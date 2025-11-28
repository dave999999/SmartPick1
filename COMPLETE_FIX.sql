-- COMPLETE FIX - Add missing columns and update function

-- Step 1: Add missing columns to user_achievements table
ALTER TABLE user_achievements
  ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reward_claimed_at TIMESTAMPTZ;

-- Step 2: Manually unlock Penny Pincher for you
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, reward_claimed)
SELECT 
    'ed0d1c67-07b7-4901-852d-7130dd5368ab',
    id,
    NOW(),
    false
FROM achievement_definitions
WHERE name ILIKE '%penny%'
ON CONFLICT (user_id, achievement_id) 
DO UPDATE SET reward_claimed = false; -- Reset if already exists

-- Step 3: Fix the claim function
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
  v_balance_before INT;
  v_balance_after INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try auto-unlock first
  BEGIN
    PERFORM check_user_achievements(v_user_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
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

  -- Get current balance
  SELECT balance INTO v_balance_before
  FROM user_points
  WHERE user_id = v_user_id;

  v_balance_after := v_balance_before + v_points;

  -- Mark as claimed
  UPDATE user_achievements
  SET reward_claimed = true, 
      reward_claimed_at = NOW()
  WHERE user_id = v_user_id 
    AND achievement_id = p_achievement_id;

  -- Add points transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after)
  VALUES (v_user_id, v_points, 'achievement_reward', v_balance_before, v_balance_after);

  -- Update balance
  UPDATE user_points
  SET balance = v_balance_after, 
      updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'points_awarded', v_points);
END;
$$;

-- Step 4: Verify it's ready to claim
SELECT 
    ad.name,
    ua.reward_claimed,
    ua.unlocked_at
FROM achievement_definitions ad
JOIN user_achievements ua ON ad.id = ua.achievement_id
WHERE ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
  AND ad.name ILIKE '%penny%';
