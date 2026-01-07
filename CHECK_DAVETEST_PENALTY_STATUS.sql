-- =========================================================
-- CHECK DAVETEST PENALTY STATUS
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
  v_missed_count INTEGER;
  v_active_penalty RECORD;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  RAISE NOTICE '=== USER: davetest@gmail.com ===';
  RAISE NOTICE 'User ID: %', v_user_id;
  
  -- Count missed pickups
  SELECT COUNT(*) INTO v_missed_count
  FROM user_missed_pickups
  WHERE user_id = v_user_id;
  
  RAISE NOTICE 'Total missed pickups: %', v_missed_count;
  
  -- Check for active penalties (no expires_at check for now)
  SELECT * INTO v_active_penalty
  FROM user_penalties
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_active_penalty IS NOT NULL THEN
    RAISE NOTICE '=== LATEST PENALTY FOUND ===';
    RAISE NOTICE 'Offense number: %', v_active_penalty.offense_number;
    RAISE NOTICE 'Points deducted: %', v_active_penalty.points_deducted;
    RAISE NOTICE 'Created at: %', v_active_penalty.created_at;
  ELSE
    RAISE NOTICE '❌ NO PENALTY FOUND';
  END IF;
  
END $$;

-- Check user_penalties table structure first
SELECT 
  '=== USER_PENALTIES STRUCTURE ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_penalties'
ORDER BY ordinal_position;

-- Show detailed data
SELECT 
  '=== MISSED PICKUPS ===' as section;

SELECT 
  id,
  reservation_id,
  created_at
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC;

-- Show all penalties
SELECT 
  '=== ALL PENALTIES ===' as section;

SELECT 
  *
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC;

-- Show failed pickup reservations
SELECT 
  '=== FAILED PICKUP RESERVATIONS ===' as section;

SELECT 
  id,
  status,
  created_at,
  expires_at
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'FAILED_PICKUP'
ORDER BY created_at DESC;
