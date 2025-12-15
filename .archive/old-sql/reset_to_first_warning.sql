-- Reset to First Warning State
-- This will remove the 2nd offense penalty and restore first warning state

-- Get user ID
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'batumashvili.davit@gmail.com';
  
  RAISE NOTICE 'User ID: %', v_user_id;
  
  -- Deactivate all active penalties
  UPDATE user_penalties
  SET is_active = false
  WHERE user_id = v_user_id
    AND is_active = true;
  
  -- Reset user suspension status
  UPDATE users
  SET 
    current_penalty_level = 0,
    total_missed_pickups = 0,
    is_suspended = false,
    suspended_until = NULL
  WHERE id = v_user_id;
  
  RAISE NOTICE '✅ All penalties cleared!';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Now you can create first warning again with test_first_warning.sql';
END $$;

-- Verify cleanup
SELECT 
  'User Status' as check_type,
  email,
  current_penalty_level,
  total_missed_pickups,
  is_suspended
FROM users
WHERE email = 'batumashvili.davit@gmail.com';

SELECT 
  'Active Penalties' as check_type,
  COUNT(*) as count
FROM user_penalties
WHERE user_id = (SELECT id FROM users WHERE email = 'batumashvili.davit@gmail.com')
  AND is_active = true;
