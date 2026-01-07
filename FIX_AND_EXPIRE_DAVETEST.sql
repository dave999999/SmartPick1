-- =========================================================
-- FIX AND EXPIRE DAVETEST RESERVATION (CORRECT)
-- =========================================================

-- Step 1: Fix expire_user_reservations to use customer_id
DROP FUNCTION IF EXISTS expire_user_reservations(UUID) CASCADE;

CREATE OR REPLACE FUNCTION expire_user_reservations(p_user_id UUID)
RETURNS TABLE(expired_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Mark user's expired reservations as FAILED_PICKUP (using customer_id)
  WITH expired AS (
    UPDATE reservations
    SET status = 'FAILED_PICKUP', updated_at = NOW()
    WHERE customer_id = p_user_id
      AND status = 'ACTIVE'
      AND expires_at < NOW()
    RETURNING id, quantity, offer_id
  )
  , restored AS (
    -- Restore offer quantities
    UPDATE offers o
    SET quantity_available = quantity_available + e.quantity,
        updated_at = NOW()
    FROM expired e
    WHERE o.id = e.offer_id
    RETURNING o.id
  )
  SELECT COUNT(*)::INTEGER INTO v_count FROM expired;
  
  -- Track expired reservations as cancellations if > 0
  IF v_count > 0 THEN
    INSERT INTO user_cancellation_tracking (user_id, created_at)
    SELECT p_user_id, NOW()
    FROM generate_series(1, v_count);
  END IF;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION expire_user_reservations(UUID) TO authenticated;

-- Step 2: Set expires_at to past (using customer_id)
UPDATE reservations
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';

-- Step 3: Call function to expire it
SELECT expire_user_reservations(
  (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
) as expired_count;

-- Step 4: Verify it's now FAILED_PICKUP
SELECT 
  id,
  status,
  expires_at,
  (expires_at < NOW()) as is_expired,
  created_at
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY created_at DESC
LIMIT 1;
