-- =========================================================
-- CLEANUP DUPLICATE PENALTIES AND RESET STATE
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
  v_missed_count INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'davetest@gmail.com';
  
  -- Check actual missed pickups
  SELECT COUNT(*) INTO v_missed_count
  FROM user_missed_pickups
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '=== CURRENT STATE ===';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Actual missed pickups: %', v_missed_count;
  
  -- Delete ALL old penalties (we'll let frontend create fresh one)
  DELETE FROM user_penalties
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✅ Deleted all old penalty records';
  RAISE NOTICE '✅ State cleaned up - frontend will create fresh penalty on next load';
END $$;

-- Verify cleanup
SELECT 
  'MISSED PICKUPS' as status,
  COUNT(*) as total_count
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

SELECT 
  'PENALTIES REMAINING' as status,
  COUNT(*) as count
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

SELECT 
  'POINT BALANCE' as status,
  balance
FROM user_points
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');
