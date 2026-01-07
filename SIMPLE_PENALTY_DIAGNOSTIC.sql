-- =========================================================
-- SIMPLE PENALTY DIAGNOSTIC
-- =========================================================

-- 1. Check if trigger exists
SELECT 
  '=== TRIGGER CHECK ===' as section;

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%penalty%' OR trigger_name LIKE '%missed%';

-- 2. Count missed pickups for davetest
SELECT 
  '=== MISSED PICKUPS COUNT ===' as section;

SELECT 
  COUNT(*) as total_missed_pickups
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- 3. Show all missed pickups
SELECT 
  '=== MISSED PICKUPS DATA ===' as section;

SELECT *
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC;

-- 4. Check if user_penalties table exists
SELECT 
  '=== PENALTIES TABLE CHECK ===' as section;

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'user_penalties'
) as table_exists;

-- 5. Count penalties
SELECT 
  '=== PENALTIES COUNT ===' as section;

SELECT COUNT(*) as total_penalties
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');
