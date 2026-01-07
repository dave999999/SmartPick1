-- Check why penalties aren't being deleted for davetest@gmail.com

-- 1. Check if user exists
SELECT 
  '=== USER EXISTS CHECK ===' as section,
  id,
  email
FROM users
WHERE email = 'davetest@gmail.com';

-- 2. Check penalties with full details
SELECT 
  '=== PENALTIES DETAIL ===' as section,
  up.*
FROM user_penalties up
WHERE up.user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com');

-- 3. Check if there are penalty_offense_history records
SELECT 
  '=== OFFENSE HISTORY ===' as section,
  poh.*
FROM penalty_offense_history poh
WHERE poh.user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com');

-- 4. Try manual delete with confirmation
DO $$
DECLARE
  v_user_id UUID;
  v_penalty_count INT;
  v_deleted_penalties INT;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'davetest@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found';
    RETURN;
  END IF;
  
  -- Count penalties before
  SELECT COUNT(*) INTO v_penalty_count FROM user_penalties WHERE user_id = v_user_id;
  RAISE NOTICE 'Found % penalties for user', v_penalty_count;
  
  -- Delete penalties
  DELETE FROM user_penalties WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_deleted_penalties = ROW_COUNT;
  RAISE NOTICE 'Deleted % penalties', v_deleted_penalties;
  
  -- Delete offense history
  DELETE FROM penalty_offense_history WHERE user_id = v_user_id;
  
  -- Reset user fields
  UPDATE users
  SET 
    penalty_count = 0,
    current_penalty_level = 0,
    is_suspended = false,
    suspended_until = NULL,
    reliability_score = 100,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  RAISE NOTICE 'User fields reset successfully';
END;
$$;

-- 5. Verify deletion
SELECT 
  '=== AFTER DELETION ===' as section,
  COUNT(*) as remaining_penalties
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'davetest@gmail.com');

-- 6. Check user status
SELECT 
  '=== USER STATUS ===' as section,
  email,
  penalty_count,
  current_penalty_level,
  is_suspended,
  suspended_until
FROM users
WHERE email = 'davetest@gmail.com';
