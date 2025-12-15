-- Find which specific line is failing
-- Run each of these ONE BY ONE to find the problem

-- Test 1: achievement_definitions
SELECT 'achievement_definitions' as test;
DROP POLICY IF EXISTS "Anyone can view achievement definitions" ON public.achievement_definitions;

-- Test 2: categories  
SELECT 'categories' as test;
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;

-- Test 3: user_bans
SELECT 'user_bans' as test;
DROP POLICY IF EXISTS "Admins can view all bans" ON public.user_bans;

-- Test 4: user_stats
SELECT 'user_stats' as test;
DROP POLICY IF EXISTS "user_stats_select_own" ON public.user_stats;

-- Test 5: Check what columns achievement_definitions has
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'achievement_definitions' AND table_schema = 'public';

-- Test 6: Check what columns categories has
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'categories' AND table_schema = 'public';

-- Test 7: Check what columns user_bans has
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_bans' AND table_schema = 'public';

-- Test 8: Check what columns user_stats has
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_stats' AND table_schema = 'public';
