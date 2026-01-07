-- Reset all missed pickup penalties for davetest@gmail.com

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Delete all penalties
  DELETE FROM user_penalties WHERE user_id = v_user_id;
  
  -- Delete offense history
  DELETE FROM penalty_offense_history WHERE user_id = v_user_id;
  
  -- Reset user's penalty status
  UPDATE users
  SET 
    total_missed_pickups = 0,
    current_penalty_level = 0,
    is_suspended = FALSE,
    suspended_until = NULL,
    reliability_score = 100,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  RAISE NOTICE '✓ All penalties cleared for davetest@gmail.com';
END $$;

-- Verify reset
SELECT 
  '✓ USER RESET' as status,
  u.email,
  u.total_missed_pickups,
  u.current_penalty_level,
  u.is_suspended,
  u.reliability_score
FROM users u
WHERE u.email = 'davetest@gmail.com';

SELECT 
  '✓ PENALTIES COUNT' as status,
  COUNT(*) as remaining_penalties
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');
