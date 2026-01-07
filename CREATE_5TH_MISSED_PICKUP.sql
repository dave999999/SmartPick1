-- =========================================================
-- CREATE 5TH MISSED PICKUP FOR DAVETEST
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_partner_id UUID;
  v_current_count INTEGER;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'davetest@gmail.com';
  
  -- Check current missed pickups
  SELECT COUNT(*) INTO v_current_count
  FROM user_missed_pickups
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '=== CURRENT STATUS ===';
  RAISE NOTICE 'Current missed pickups: %', v_current_count;
  
  -- Get active reservation
  SELECT id, partner_id INTO v_reservation_id, v_partner_id
  FROM reservations
  WHERE user_id = v_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_reservation_id IS NULL THEN
    RAISE NOTICE '❌ No active reservation found to expire';
    RETURN;
  END IF;
  
  RAISE NOTICE '=== EXPIRING RESERVATION ===';
  RAISE NOTICE 'Reservation ID: %', v_reservation_id;
  RAISE NOTICE 'Partner ID: %', v_partner_id;
  
  -- Expire the reservation
  UPDATE reservations
  SET status = 'expired',
      updated_at = NOW()
  WHERE id = v_reservation_id;
  
  -- Add to missed pickups
  INSERT INTO user_missed_pickups (
    user_id,
    reservation_id,
    partner_id,
    created_at
  ) VALUES (
    v_user_id,
    v_reservation_id,
    v_partner_id,
    NOW()
  )
  ON CONFLICT (reservation_id) DO NOTHING;
  
  -- Check new count
  SELECT COUNT(*) INTO v_current_count
  FROM user_missed_pickups
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✅ Reservation expired!';
  RAISE NOTICE '✅ New missed pickup count: %', v_current_count;
END $$;

-- Verify results
SELECT 
  'MISSED PICKUPS' as status,
  COUNT(*) as total_count
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Show latest penalty (should auto-create for 5th offense)
SELECT 
  'LATEST PENALTY' as status,
  offense_number,
  penalty_type,
  is_active,
  points_required,
  suspended_until
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 1;
