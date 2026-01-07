-- =========================================================
-- GET PENALTY DETAILS
-- =========================================================

-- Show all penalty data
SELECT 
  '=== PENALTY DETAILS ===' as section;

SELECT *
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC;

-- Check if penalties table structure
SELECT 
  '=== PENALTY TABLE STRUCTURE ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_penalties'
ORDER BY ordinal_position;
