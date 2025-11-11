-- Manually trigger achievement checking for your user
-- This will check your stats and unlock achievements you've earned

-- First, check your current stats
SELECT 
  user_id,
  total_reservations,
  total_money_saved,
  category_counts,
  partner_visit_counts,
  unique_partners_visited,
  current_streak_days,
  longest_streak_days,
  total_referrals
FROM user_stats
WHERE user_id = auth.uid();

-- Then manually trigger achievement checking
SELECT check_user_achievements(auth.uid());

-- After running, check what was unlocked
SELECT 
  ua.id,
  ad.name,
  ad.icon,
  ad.reward_points,
  ua.reward_claimed,
  ua.unlocked_at
FROM user_achievements ua
JOIN achievement_definitions ad ON ad.id = ua.achievement_id
WHERE ua.user_id = auth.uid()
ORDER BY ua.unlocked_at DESC;
