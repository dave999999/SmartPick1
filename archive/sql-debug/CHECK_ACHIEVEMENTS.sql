-- Quick check: Are achievements in the database?
SELECT 
  'Total achievements:' as check_name,
  COUNT(*) as count
FROM public.achievement_definitions
WHERE is_active = true;

-- Show a few examples
SELECT 
  id,
  name,
  category,
  tier,
  reward_points
FROM public.achievement_definitions
WHERE is_active = true
ORDER BY reward_points
LIMIT 10;
