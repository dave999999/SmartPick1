-- Force unlock ALL achievements you've earned based on progress shown in UI

-- Check loyal_customer requirements
SELECT id, name, requirement 
FROM achievement_definitions 
WHERE id = 'loyal_customer';

-- Check if you meet the requirements
SELECT 
    user_id,
    total_reservations,
    total_money_saved
FROM user_stats 
WHERE user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- Force unlock loyal_customer if requirements are met
INSERT INTO user_achievements (user_id, achievement_id, reward_claimed, unlocked_at)
VALUES (
    'ed0d1c67-07b7-4901-852d-7130dd5368ab',
    'loyal_customer',
    false,
    NOW()
)
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Verify it's now unlocked
SELECT 
    ad.name,
    ua.reward_claimed,
    CASE 
        WHEN ua.reward_claimed THEN '✅ Claimed'
        WHEN ua.id IS NOT NULL THEN '🎁 Ready!'
        ELSE '🔒 Locked'
    END as status
FROM achievement_definitions ad
LEFT JOIN user_achievements ua ON ad.id = ua.achievement_id 
    AND ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
WHERE ad.id IN ('loyal_customer', 'bargain_hunter', 'smart_saver')
ORDER BY ad.name;
