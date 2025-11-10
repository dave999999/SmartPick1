-- ================================================
-- DEBUG: Check if gamification is working
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Check if trigger exists and is enabled
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%gamification%'
   OR trigger_name LIKE '%user_stats%';

-- 2. Check trigger function source code
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_user_stats_on_pickup'
  AND routine_schema = 'public';

-- 3. Check if user_stats row exists for your user
-- Replace 'YOUR_USER_ID' with actual user ID
SELECT * FROM user_stats 
WHERE user_id = 'YOUR_USER_ID'::uuid;

-- 4. Check if check_user_achievements function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'check_user_achievements';

-- 5. Test manually calling the trigger
-- Replace with your actual user_id
SELECT check_user_achievements('YOUR_USER_ID'::uuid);

-- 6. Check if any achievements were unlocked
SELECT 
  ua.id,
  ua.achievement_id,
  ad.name,
  ad.icon,
  ua.unlocked_at,
  ua.reward_claimed
FROM user_achievements ua
JOIN achievement_definitions ad ON ad.id = ua.achievement_id
WHERE ua.user_id = 'YOUR_USER_ID'::uuid
ORDER BY ua.unlocked_at DESC;
