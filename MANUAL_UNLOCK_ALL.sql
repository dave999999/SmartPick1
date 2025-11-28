-- MANUAL UNLOCK: Unlock ALL achievements based on your current stats

-- First, check your stats
SELECT 
    user_id,
    total_reservations,
    total_money_saved,
    current_streak_days,
    total_referrals
FROM user_stats 
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- Check what achievements exist
SELECT id, name, requirement, reward_points
FROM achievement_definitions
WHERE is_active = true
ORDER BY name;

-- Manually insert ALL achievements you qualify for
-- Based on your stats, insert the ones you've earned

-- For reservations-based achievements (assuming you have 12+ reservations based on penny_pincher being at 12/10)
INSERT INTO user_achievements (user_id, achievement_id, reward_claimed, unlocked_at)
SELECT 
    'ed0d1c67-07b7-4901-852d-7130dd5368ab',
    ad.id,
    false,
    NOW()
FROM achievement_definitions ad
WHERE ad.is_active = true
  AND ad.requirement->>'type' = 'reservations'
  AND 12 >= (ad.requirement->>'count')::INT -- Replace 12 with your actual reservation count
  AND NOT EXISTS (
    SELECT 1 FROM user_achievements ua 
    WHERE ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab' 
    AND ua.achievement_id = ad.id
  );

-- For money_saved achievements (assuming you have some savings)
INSERT INTO user_achievements (user_id, achievement_id, reward_claimed, unlocked_at)
SELECT 
    'ed0d1c67-07b7-4901-852d-7130dd5368ab',
    ad.id,
    false,
    NOW()
FROM achievement_definitions ad
WHERE ad.is_active = true
  AND ad.requirement->>'type' = 'money_saved'
  AND 0 >= (ad.requirement->>'amount')::DECIMAL -- Replace with your actual money saved
  AND NOT EXISTS (
    SELECT 1 FROM user_achievements ua 
    WHERE ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab' 
    AND ua.achievement_id = ad.id
  );

-- Show what you can now claim
SELECT 
    ad.id,
    ad.name,
    ad.reward_points,
    ua.reward_claimed,
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
