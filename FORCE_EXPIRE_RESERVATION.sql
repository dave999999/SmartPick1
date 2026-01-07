-- =========================================================
-- FORCE EXPIRE SPECIFIC RESERVATION
-- =========================================================
-- Run CHECK_DAVETEST_RESERVATIONS.sql first to get the reservation ID
-- Then replace YOUR_RESERVATION_ID_HERE with the actual ID

DO $$
DECLARE
  v_user_id UUID;
  v_reservation_id UUID := 'YOUR_RESERVATION_ID_HERE'; -- REPLACE THIS
  v_partner_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'davetest@gmail.com';
  
  -- Get partner_id from reservation
  SELECT partner_id INTO v_partner_id
  FROM reservations
  WHERE id = v_reservation_id;
  
  IF v_partner_id IS NULL THEN
    RAISE NOTICE '❌ Reservation not found';
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
  
  RAISE NOTICE '✅ Updated reservation status';
  
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
  
  RAISE NOTICE '✅ Added to missed pickups!';
END $$;

-- Verify
SELECT 
  'RESULT' as status,
  (SELECT COUNT(*) FROM user_missed_pickups WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')) as total_missed,
  (SELECT status FROM reservations WHERE id = 'YOUR_RESERVATION_ID_HERE') as reservation_status;
