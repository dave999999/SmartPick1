-- Check if penalty system tables and functions exist
-- Run this to see what's missing

-- 1. Check if user_penalties table exists
SELECT 'user_penalties table' as check_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_penalties'
  ) THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status;

-- 2. Check if penalty_offense_history table exists
SELECT 'penalty_offense_history table' as check_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'penalty_offense_history'
  ) THEN 'EXISTS ✓' ELSE 'MISSING ✗' END as status;

-- 3. Check penalty-related functions
SELECT 'Penalty functions' as check_type;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (routine_name LIKE '%penalty%' 
    OR routine_name LIKE '%missed%'
    OR routine_name LIKE '%offense%')
ORDER BY routine_name;

-- 4. Check triggers on reservations table related to penalties
SELECT 'Reservation triggers' as check_type;
SELECT tgname as trigger_name, tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'public.reservations'::regclass
  AND (tgname LIKE '%penalty%' OR tgname LIKE '%missed%' OR tgname LIKE '%noshow%')
ORDER BY tgname;

-- 5. If user_penalties exists, show davetest penalties
SELECT 'Existing penalties for davetest' as check_type;
SELECT 
  p.offense_number,
  p.offense_type,
  p.penalty_type,
  p.suspended_until,
  p.is_active,
  p.acknowledged,
  p.created_at
FROM user_penalties p
WHERE p.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY p.created_at DESC
LIMIT 5;
