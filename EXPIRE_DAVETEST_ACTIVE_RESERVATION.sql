-- =========================================================
-- EXPIRE ACTIVE RESERVATION FOR DAVETEST
-- =========================================================

DO $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID;
  v_partner_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'davetest@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User not found';
    RETURN;
  END IF;
  
  -- Get active reservation
  SELECT id, partner_id INTO v_reservation_id, v_partner_id
  FROM reservations
  WHERE user_id = v_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_reservation_id IS NULL THEN
    RAISE NOTICE '❌ No active reservation found';
    RETURN;
  END IF;
  
  RAISE NOTICE '=== EXPIRING RESERVATION ===';
  RAISE NOTICE 'User: %', v_user_id;
  RAISE NOTICE 'Reservation: %', v_reservation_id;
  RAISE NOTICE 'Partner: %', v_partner_id;
  
  -- Update reservation status to expired
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
  
  RAISE NOTICE '✅ Reservation expired and tracked as missed pickup!';
END $$;

-- Verify
SELECT 
  'MISSED PICKUPS' as status,
  COUNT(*) as total_missed,
  MAX(created_at) as latest_miss
FROM user_missed_pickups
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- Check penalty status
SELECT 
  'PENALTY STATUS' as status,
  id,
  offense_number,
  penalty_type,
  is_active,
  suspended_until,
  points_required
FROM user_penalties
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 1;
