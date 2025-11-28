-- Unlock First Pick achievement for you

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, reward_claimed)
VALUES (
    'ed0d1c67-07b7-4901-852d-7130dd5368ab',
    'first_pick',
    NOW(),
    false
)
ON CONFLICT (user_id, achievement_id) 
DO UPDATE SET reward_claimed = false;

-- Verify both achievements are ready
SELECT 
    ad.name,
    ua.reward_claimed,
    ua.unlocked_at
FROM achievement_definitions ad
JOIN user_achievements ua ON ad.id = ua.achievement_id
WHERE ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
  AND ad.name IN ('First Pick', 'Penny Pincher')
ORDER BY ad.name;
