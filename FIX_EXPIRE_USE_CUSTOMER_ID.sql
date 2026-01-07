-- =========================================================
-- FIX: Update expire function to use CUSTOMER_ID
-- =========================================================

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
  -- Find all ACTIVE reservations that have expired
  -- CHECK CUSTOMER_ID (not user_id)
  FOR v_rec IN
    SELECT 
      r.id as reservation_id,
      r.offer_id,
      r.quantity,
      r.partner_id
    FROM reservations r
    WHERE r.customer_id = p_user_id  -- USE CUSTOMER_ID
      AND r.status = 'ACTIVE'
      AND r.expires_at < NOW()
  LOOP
    -- Update to FAILED_PICKUP (not EXPIRED - they're the same thing!)
    UPDATE reservations
    SET status = 'FAILED_PICKUP',
        updated_at = NOW()
    WHERE id = v_rec.reservation_id;
    
    -- Restore quantity
    UPDATE offers
    SET quantity_available = quantity_available + v_rec.quantity,
        updated_at = NOW()
    WHERE id = v_rec.offer_id;
    
    -- Track missed pickup (without conflict handling)
    BEGIN
      INSERT INTO user_missed_pickups (
        user_id,
        reservation_id,
        created_at
      ) VALUES (
        p_user_id,
        v_rec.reservation_id,
        NOW()
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- Already tracked, skip
        NULL;
    END;
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  RETURN v_expired_count;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_user_reservations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_user_reservations(UUID) TO anon;

-- Run it immediately for davetest
SELECT expire_user_reservations(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
) as expired_count;

-- Verify it worked
SELECT 
  'AFTER FIX' as status,
  COUNT(*) as active_count
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';
