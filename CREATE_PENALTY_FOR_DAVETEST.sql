-- =========================================================
-- CREATE SUSPENSION PENALTY FOR EXISTING MISSED PICKUPS
-- =========================================================
-- Manually create penalty for davetest who already has 4 missed pickups
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
  v_missed_count INTEGER;
  v_existing_penalty UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'davetest@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User not found';
    RETURN;
  END IF;
  
  -- Count missed pickups
  SELECT COUNT(*) INTO v_missed_count
  FROM user_missed_pickups
  WHERE user_id = v_user_id
    AND created_at > NOW() - INTERVAL '30 days';
  
  RAISE NOTICE '=== CREATING SUSPENSION PENALTY ===';
  RAISE NOTICE 'User: %', v_user_id;
  RAISE NOTICE 'Missed pickups: %', v_missed_count;
  
  -- Check if penalty already exists
  SELECT id INTO v_existing_penalty
  FROM user_penalties
  WHERE user_id = v_user_id
    AND is_active = true;
    
  IF v_existing_penalty IS NOT NULL THEN
    RAISE NOTICE '⚠️  Active penalty already exists: %', v_existing_penalty;
    RETURN;
  END IF;
  
  -- Create suspension penalty based on missed pickup count
  IF v_missed_count >= 4 THEN
    INSERT INTO user_penalties (
      user_id,
      penalty_type,
      offense_number,
      reason,
      is_active,
      suspended_until,
      created_at
    )
    VALUES (
      v_user_id,
      'SUSPENSION',
      v_missed_count,
      'Repeated missed pickups - offense #' || v_missed_count,
      true,
      NOW() + CASE
        WHEN v_missed_count = 4 THEN INTERVAL '1 hour'
        WHEN v_missed_count = 5 THEN INTERVAL '24 hours'
        ELSE INTERVAL '7 days'
      END,
      NOW()
    )
    RETURNING id INTO v_existing_penalty;
    
    RAISE NOTICE '✅ Created suspension penalty: %', v_existing_penalty;
    RAISE NOTICE '⏰ Suspended until: %', (NOW() + CASE
      WHEN v_missed_count = 4 THEN INTERVAL '1 hour'
      WHEN v_missed_count = 5 THEN INTERVAL '24 hours'
      ELSE INTERVAL '7 days'
    END);
  ELSE
    RAISE NOTICE '⚠️  Not enough missed pickups (need 4+, have %)', v_missed_count;
  END IF;
END $$;

-- Verify - should now show active penalty
SELECT 
  'ACTIVE PENALTY' as status,
  id,
  penalty_type,
  offense_number,
  reason,
  is_active,
  suspended_until,
  (suspended_until > NOW()) as is_currently_suspended,
  EXTRACT(EPOCH FROM (suspended_until - NOW()))/60 as minutes_remaining
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND is_active = true;
