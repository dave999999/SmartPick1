-- ================================================
-- COMPLETE DIAGNOSTIC + FIX for Achievement Claim
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Check if function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'claim_achievement'
  ) THEN
    RAISE NOTICE '✅ claim_achievement function exists';
  ELSE
    RAISE NOTICE '❌ claim_achievement function DOES NOT exist';
  END IF;
END $$;

-- 2. Check function parameters
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as parameters,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'claim_achievement'
  AND n.nspname = 'public';

-- 3. Drop ALL versions of claim_achievement (in case there are multiple signatures)
DROP FUNCTION IF EXISTS claim_achievement(TEXT) CASCADE;
DROP FUNCTION IF EXISTS claim_achievement(UUID) CASCADE;

-- 4. Create the correct version
CREATE OR REPLACE FUNCTION claim_achievement(p_achievement_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_def achievement_definitions%ROWTYPE;
  v_row user_achievements%ROWTYPE;
  v_current_balance INT;
  v_new_balance INT;
BEGIN
  -- Log who's calling
  RAISE NOTICE 'claim_achievement called by user: %', v_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the achievement
  SELECT * INTO v_row FROM user_achievements
  WHERE user_id = v_user_id AND achievement_id = p_achievement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not unlocked for this user';
  END IF;

  RAISE NOTICE 'Found user_achievement: id=%, reward_claimed=%', v_row.id, v_row.reward_claimed;

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
    RAISE EXCEPTION 'Achievement definition missing: %', p_achievement_id;
  END IF;

  RAISE NOTICE 'Found achievement definition: name=%, points=%', v_def.name, v_def.reward_points;

  -- Award points directly
  SELECT COALESCE(balance, 0) INTO v_current_balance
  FROM user_points
  WHERE user_id = v_user_id;

  v_new_balance := COALESCE(v_current_balance, 0) + v_def.reward_points;

  RAISE NOTICE 'Points: old=%, new=%', v_current_balance, v_new_balance;

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

  RAISE NOTICE 'Successfully claimed achievement!';

  RETURN jsonb_build_object(
    'success', true,
    'awarded_now', true,
    'reward_points', v_def.reward_points,
    'balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION claim_achievement(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_achievement(TEXT) TO anon;

-- 6. Verify
SELECT 
  'Function created successfully!' as status,
  COUNT(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'claim_achievement'
  AND n.nspname = 'public';
