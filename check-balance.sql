-- Check your current balance and recent transactions
SELECT 
    up.balance as current_balance,
    up.updated_at as last_updated
FROM user_points up
WHERE up.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab';

-- Check recent point transactions
SELECT 
    pt.change,
    pt.reason,
    pt.balance_before,
    pt.balance_after,
    pt.created_at
FROM point_transactions pt
WHERE pt.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
ORDER BY pt.created_at DESC
LIMIT 10;

-- Check claimed achievements
SELECT 
    ad.name,
    ad.reward_points,
    ua.reward_claimed,
    ua.reward_claimed_at
FROM achievement_definitions ad
JOIN user_achievements ua ON ad.id = ua.achievement_id
WHERE ua.user_id = 'ed0d1c67-07b7-4901-852d-7130dd5368ab'
  AND ua.reward_claimed = true
ORDER BY ua.reward_claimed_at DESC;
