-- Check if user_achievements have the reward_claimed column and data
SELECT 
  ua.id,
  ua.user_id,
  ua.achievement_id,
  ad.name as achievement_name,
  ua.unlocked_at,
  ua.is_new,
  ua.reward_claimed,
  ua.reward_claimed_at,
  ua.points_awarded
FROM user_achievements ua
JOIN achievement_definitions ad ON ad.id = ua.achievement_id
ORDER BY ua.unlocked_at DESC
LIMIT 10;
