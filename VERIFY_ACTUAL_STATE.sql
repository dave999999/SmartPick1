-- ============================================
-- VERIFY WHAT'S ACTUALLY HAPPENING
-- ============================================

-- Step 1: Show ALL user penalties for this user (including inactive)
SELECT 
  'ALL PENALTIES FOR USER:' as info,
  id,
  offense_number,
  penalty_type,
  is_active,
  acknowledged,
  suspended_until,
  created_at
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
ORDER BY created_at DESC;

-- Step 2: Check if function contains the fix
SELECT 
  'FUNCTION CHECK:' as info,
  CASE 
    WHEN prosrc LIKE '%penalty_type IN (''1hour'', ''24hour'', ''permanent'')%' THEN '✅ Function has correct fix'
    WHEN prosrc LIKE '%penalty_type = ''suspension''%' THEN '❌ Function has OLD wrong fix'
    WHEN prosrc LIKE '%penalty_type%' THEN '⚠️ Function mentions penalty_type but unclear'
    ELSE '❌ Function does NOT filter by penalty_type at all'
  END as fix_status
FROM pg_proc
WHERE proname = 'create_reservation_atomic';

-- ============================================
-- Step 4: MANUAL CHECK - What would the query return?
-- ============================================
SELECT 
  'WHAT QUERY SEES:' as info,
  EXISTS(
    SELECT 1 FROM user_penalties
    WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
    AND is_active = true
    AND penalty_type IN ('1hour', '24hour', 'permanent')
  ) as has_suspension_penalty,
  EXISTS(
    SELECT 1 FROM user_penalties
    WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
    AND is_active = true
  ) as has_any_penalty;
