-- COMPLETE FIX: Auto-unlock all achievements you've earned

-- Step 1: Make sure check_user_achievements function is correct
DROP FUNCTION IF EXISTS check_user_achievements(UUID);

CREATE OR REPLACE FUNCTION check_user_achievements(p_user_id UUID)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats RECORD;
  v_achievement RECORD;
  v_already_has BOOLEAN;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
  
  IF v_stats IS NULL THEN
    RETURN; -- User has no stats yet
  END IF;

  -- Loop through all active achievements
  FOR v_achievement IN
    SELECT * FROM achievement_definitions WHERE is_active = true
  LOOP
    -- Check if user already has this achievement
    SELECT EXISTS(
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_has;

    IF v_already_has THEN
      CONTINUE; -- Skip if already unlocked
    END IF;

    -- Check if user qualifies and ONLY UNLOCK (don't award points)
    IF v_achievement.requirement->>'type' = 'reservations' THEN
      IF v_stats.total_reservations >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, reward_claimed)
        VALUES (p_user_id, v_achievement.id, false);
      END IF;

    ELSIF v_achievement.requirement->>'type' = 'money_saved' THEN
      IF v_stats.total_money_saved >= (v_achievement.requirement->>'amount')::DECIMAL THEN
        INSERT INTO user_achievements (user_id, achievement_id, reward_claimed)
        VALUES (p_user_id, v_achievement.id, false);
      END IF;

    ELSIF v_achievement.requirement->>'type' = 'streak' THEN
      IF v_stats.current_streak_days >= (v_achievement.requirement->>'days')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, reward_claimed)
        VALUES (p_user_id, v_achievement.id, false);
      END IF;

    ELSIF v_achievement.requirement->>'type' = 'referrals' THEN
      IF v_stats.total_referrals >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, reward_claimed)
        VALUES (p_user_id, v_achievement.id, false);
      END IF;
      
    -- Add other achievement types as needed
    END IF;
  END LOOP;
END;
$$;

-- Step 2: Run check for your user RIGHT NOW
SELECT check_user_achievements('ed0d1c67-07b7-4901-852d-7130dd5368ab');

-- Step 3: Show all achievements you now have unlocked
SELECT 
    ad.id,
    ad.name,
    ad.reward_points,
    ad.requirement,
    ua.reward_claimed,
    ua.unlocked_at,
    CASE 
        WHEN ua.reward_claimed THEN '✅ Claimed'
        WHEN ua.id IS NOT NULL THEN '🎁 Ready to Claim!'
        ELSE '🔒 Locked'
    END as status
FROM achievement_definitions ad
LEFT JOIN user_achievements ua ON ad.id = ua.achievement_id 
    AND ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
WHERE ad.is_active = true
ORDER BY 
    CASE 
        WHEN ua.id IS NOT NULL AND NOT ua.reward_claimed THEN 1
        WHEN ua.reward_claimed THEN 2
        ELSE 3
    END,
    ad.name;

-- Step 4: Show your stats to verify requirements
SELECT 
    total_reservations,
    total_money_saved,
    current_streak_days,
    total_referrals
FROM user_stats 
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';
