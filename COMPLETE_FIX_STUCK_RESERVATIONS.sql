-- =========================================================
-- COMPLETE DIAGNOSIS AND FIX
-- =========================================================

-- STEP 1: Check what's actually in the database RIGHT NOW
SELECT 
  '=== CURRENT DATABASE STATE ===' as step,
  r.id,
  r.status as current_status,
  r.expires_at,
  (r.expires_at < NOW()) as is_expired,
  (NOW() - r.expires_at) as time_ago
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND r.status = 'active'
ORDER BY r.created_at DESC;

-- STEP 2: Check if expire_user_reservations function exists and is correct
SELECT 
  '=== FUNCTION CHECK ===' as step,
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'expire_user_reservations';

-- STEP 3: FORCE FIX - Manually expire ALL old active reservations
DO $$
DECLARE
  v_user_id UUID;
  v_rec RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'davetest@gmail.com';
  
  RAISE NOTICE '=== FORCE EXPIRING ALL OLD ACTIVE RESERVATIONS ===';
  
  -- Loop through each expired active reservation
  FOR v_rec IN
    SELECT 
      r.id,
      r.offer_id,
      r.quantity,
      r.partner_id,
      r.expires_at
    FROM reservations r
    WHERE r.user_id = v_user_id
      AND r.status = 'active'
      AND r.expires_at < NOW()
  LOOP
    RAISE NOTICE 'Expiring reservation % (expired % ago)', 
      v_rec.id, 
      NOW() - v_rec.expires_at;
    
    -- Update to expired
    UPDATE reservations
    SET status = 'expired',
        updated_at = NOW()
    WHERE id = v_rec.id;
    
    -- Restore quantity
    UPDATE offers
    SET quantity_available = quantity_available + v_rec.quantity,
        updated_at = NOW()
    WHERE id = v_rec.offer_id;
    
    -- Track missed pickup
    INSERT INTO user_missed_pickups (
      user_id,
      reservation_id,
      partner_id,
      created_at
    ) VALUES (
      v_user_id,
      v_rec.id,
      v_rec.partner_id,
      NOW()
    )
    ON CONFLICT (reservation_id) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Expired % reservation(s)', v_count;
END $$;

-- STEP 4: Verify the fix
SELECT 
  '=== AFTER FIX ===' as step,
  COUNT(*) as active_count
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND r.status = 'active';

-- STEP 5: Show all reservations
SELECT 
  '=== ALL RESERVATIONS ===' as step,
  r.id,
  r.status,
  r.expires_at,
  (NOW() - r.expires_at) as time_ago
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC
LIMIT 10;
