-- Debug: Check user_achievements table
-- Run this in Supabase SQL Editor to see your achievements

-- 1. Check if achievements exist for your user
SELECT 
  ua.id,
  ua.user_id,
  ua.achievement_id,
  ad.name as achievement_name,
  ad.icon,
  ua.unlocked_at,
  ua.is_new,
  ua.reward_claimed,
  ua.reward_claimed_at,
  ua.points_awarded
FROM user_achievements ua
JOIN achievement_definitions ad ON ad.id = ua.achievement_id
WHERE ua.user_id = auth.uid()  -- Replace with your actual user_id if needed
ORDER BY ua.unlocked_at DESC;

-- 2. Check total count
SELECT COUNT(*) as total_achievements FROM user_achievements WHERE user_id = auth.uid();

-- 3. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_achievements';

-- 4. Check if reward_claimed column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_achievements'
ORDER BY ordinal_position;
