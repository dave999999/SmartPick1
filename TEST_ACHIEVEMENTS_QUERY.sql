-- Test if achievements can be read by anyone
-- Run this in Supabase SQL Editor

-- 1. Count total achievements
SELECT COUNT(*) as total_achievements
FROM achievement_definitions
WHERE is_active = true;

-- 2. Show first 5 achievements
SELECT id, name, icon, tier, category, requirement, reward_points
FROM achievement_definitions
WHERE is_active = true
ORDER BY tier, category
LIMIT 5;

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'achievement_definitions';

-- 4. Test as anonymous user (simulating frontend query)
SET ROLE anon;
SELECT COUNT(*) as achievements_visible_to_anon
FROM achievement_definitions
WHERE is_active = true;
RESET ROLE;
