-- Get user ID for davitbatumashvili@gmail.com
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE email = 'davitbatumashvili@gmail.com';
  RAISE NOTICE 'User ID: %', v_user_id;
END $$;

-- Check all penalties for this user (active and inactive)
SELECT 
  id, 
  user_id, 
  penalty_type, 
  offense_number, 
  is_active, 
  acknowledged,
  suspended_until,
  created_at,
  updated_at
FROM user_penalties 
WHERE user_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
ORDER BY created_at DESC;

-- Check what the RPC function returns
SELECT * FROM get_active_penalty((SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com'));

-- Check offense history
SELECT 
  user_id,
  offense_count,
  last_offense_date
FROM penalty_offense_history
WHERE user_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com');
