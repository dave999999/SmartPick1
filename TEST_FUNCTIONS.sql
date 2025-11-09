-- ============================================
-- TEST IF FUNCTIONS WORK
-- Run this to manually test the setup
-- ============================================

-- Test 1: Check if add_user_points exists
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname IN ('add_user_points', 'add_partner_points');

-- Test 2: Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_points', 'partner_points', 'point_transactions', 'partner_point_transactions');

-- Test 3: Try to call add_user_points (this will fail with permission error - that's OK!)
-- This just checks if the function signature is correct
SELECT add_user_points(
  '00000000-0000-0000-0000-000000000000'::uuid,
  5,
  'TEST',
  '{}'::jsonb
);

-- If you see "Permission denied: only backend can modify points" - that's GOOD!
-- It means the function exists and security is working.

-- If you see "function add_user_points does not exist" - that's BAD!
-- You need to run FIX_ADD_USER_POINTS.sql
