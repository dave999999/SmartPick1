-- FINAL COMPLETE FIX - Auto-unlock and claim for ALL users

-- Step 1: Fix check_user_achievements to actually work
DROP FUNCTION IF EXISTS check_user_achievements(UUID);

CREATE OR REPLACE FUNCTION check_user_achievements(p_user_id UUID)
RETURNS TABLE(unlocked_count INT) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats RECORD;
  v_achievement RECORD;
  v_count INT := 0;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
  
  IF v_stats IS NULL THEN
    RETURN QUERY SELECT 0;
    RETURN;
  END IF;

  -- Loop through all active achievements
  FOR v_achievement IN
    SELECT * FROM achievement_definitions WHERE is_active = true
  LOOP
    -- Skip if already unlocked
    IF EXISTS(SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = v_achievement.id) THEN
      CONTINUE;
    END IF;

    -- Check requirements and unlock
    IF (v_achievement.requirement->>'type' = 'reservations' AND 
        v_stats.total_reservations >= (v_achievement.requirement->>'count')::INT) OR
       (v_achievement.requirement->>'type' = 'money_saved' AND 
        v_stats.total_money_saved >= (v_achievement.requirement->>'amount')::DECIMAL) OR
       (v_achievement.requirement->>'type' = 'streak' AND 
        v_stats.current_streak_days >= (v_achievement.requirement->>'days')::INT) OR
       (v_achievement.requirement->>'type' = 'referrals' AND 
        v_stats.total_referrals >= (v_achievement.requirement->>'count')::INT) THEN
      
      -- Unlock achievement
      INSERT INTO user_achievements (user_id, achievement_id, reward_claimed, unlocked_at)
      VALUES (p_user_id, v_achievement.id, false, NOW())
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$;

-- Step 2: Improved claim function with better error handling
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
  v_partner_id UUID;
  v_is_partner BOOLEAN := false;
  v_unlocked_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is a partner
  SELECT p.id INTO v_partner_id
  FROM partners p
  WHERE p.user_id = v_user_id AND p.status = 'APPROVED';
  
  v_is_partner := (v_partner_id IS NOT NULL);

  -- Auto-unlock achievements and get count
  SELECT unlocked_count INTO v_unlocked_count FROM check_user_achievements(v_user_id);
  
  -- Try to get achievement (retry once if just unlocked)
  SELECT * INTO v_row 
  FROM user_achievements
  WHERE user_id = v_user_id AND achievement_id = p_achievement_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Achievement not unlocked for this user' USING ERRCODE = 'P0001';
  END IF;

  IF v_row.reward_claimed THEN
    RAISE EXCEPTION 'Achievement reward already claimed' USING ERRCODE = 'P0002';
  END IF;

  -- Get points
  SELECT reward_points INTO v_points
  FROM achievement_definitions
  WHERE id = p_achievement_id;

  -- Get current balance and update correct table
  IF v_is_partner THEN
    SELECT balance INTO v_balance_before FROM partner_points WHERE user_id = v_partner_id;
    v_balance_after := COALESCE(v_balance_before, 0) + v_points;
    
    UPDATE partner_points
    SET balance = v_balance_after, updated_at = NOW()
    WHERE user_id = v_partner_id;
    
    INSERT INTO partner_point_transactions (partner_id, change, reason, balance_before, balance_after)
    VALUES (v_partner_id, v_points, 'achievement_reward', COALESCE(v_balance_before, 0), v_balance_after);
  ELSE
    SELECT balance INTO v_balance_before FROM user_points WHERE user_id = v_user_id;
    v_balance_after := COALESCE(v_balance_before, 0) + v_points;
    
    UPDATE user_points
    SET balance = v_balance_after, updated_at = NOW()
    WHERE user_id = v_user_id;
    
    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after)
    VALUES (v_user_id, v_points, 'achievement_reward', COALESCE(v_balance_before, 0), v_balance_after);
  END IF;

  -- Mark as claimed
  UPDATE user_achievements
  SET reward_claimed = true, reward_claimed_at = NOW()
  WHERE user_id = v_user_id AND achievement_id = p_achievement_id;

  RETURN jsonb_build_object(
    'success', true, 
    'points_awarded', v_points,
    'new_balance', v_balance_after
  );
END;
$$;

-- Step 3: Test it by running check for your user
SELECT * FROM check_user_achievements('ed0d1c67-07b7-4901-852d-7130dd5368ab');

-- Step 4: Show all your achievements
SELECT 
    ad.name,
    ad.reward_points,
    ua.reward_claimed,
    CASE 
        WHEN ua.reward_claimed THEN '✅ Claimed'
        WHEN ua.id IS NOT NULL THEN '🎁 Ready!'
        ELSE '🔒 Locked'
    END as status
FROM achievement_definitions ad
LEFT JOIN user_achievements ua ON ad.id = ua.achievement_id 
    AND ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
WHERE ad.is_active = true
ORDER BY status, ad.name;
