-- =========================================================
-- COMPLETE FIX: UPPERCASE STATUS + FUNCTION UPDATE
-- =========================================================

-- STEP 1: Check current state
SELECT 
  '=== BEFORE FIX ===' as step,
  status,
  COUNT(*) as count
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
GROUP BY status;

-- STEP 2: Force update ALL statuses to UPPERCASE
UPDATE reservations
SET status = UPPER(status),
    updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com');

-- STEP 3: Verify no ACTIVE reservations
SELECT 
  '=== ACTIVE COUNT ===' as step,
  COUNT(*) as active_count
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';

-- STEP 4: Update expire_user_reservations function to use UPPERCASE
DROP FUNCTION IF EXISTS expire_user_reservations(UUID) CASCADE;

CREATE OR REPLACE FUNCTION expire_user_reservations(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_rec RECORD;
BEGIN
  -- Find all ACTIVE reservations that have expired (UPPERCASE check)
  FOR v_rec IN
    SELECT 
      r.id as reservation_id,
      r.offer_id,
      r.quantity,
      r.partner_id
    FROM reservations r
    WHERE r.user_id = p_user_id
      AND r.status = 'ACTIVE'  -- UPPERCASE
      AND r.expires_at < NOW()
  LOOP
    -- Update reservation status to EXPIRED (UPPERCASE)
    UPDATE reservations
    SET status = 'EXPIRED',
        updated_at = NOW()
    WHERE id = v_rec.reservation_id;
    
    -- Restore offer quantity
    UPDATE offers
    SET quantity_available = quantity_available + v_rec.quantity,
        updated_at = NOW()
    WHERE id = v_rec.offer_id;
    
    -- Track as missed pickup
    INSERT INTO user_missed_pickups (
      user_id,
      reservation_id,
      partner_id,
      created_at
    ) VALUES (
      p_user_id,
      v_rec.reservation_id,
      v_rec.partner_id,
      NOW()
    )
    ON CONFLICT (reservation_id) DO NOTHING;
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  RETURN v_expired_count;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_user_reservations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_user_reservations(UUID) TO anon;

-- STEP 5: Run the function to clean up
SELECT expire_user_reservations(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
) as expired_count;

-- STEP 6: Final verification
SELECT 
  '=== FINAL STATE ===' as step,
  status,
  COUNT(*) as count
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
GROUP BY status;
