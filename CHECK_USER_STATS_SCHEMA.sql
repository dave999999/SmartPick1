-- ================================================
-- CHECK: What columns exist in user_stats table
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Check actual columns in user_stats
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_stats'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check a sample user_stats row
SELECT * FROM user_stats LIMIT 1;

-- 3. List all achievement types we have
SELECT 
  requirement->>'type' as achievement_type,
  COUNT(*) as count
FROM achievement_definitions
WHERE is_active = true
GROUP BY requirement->>'type'
ORDER BY count DESC;
