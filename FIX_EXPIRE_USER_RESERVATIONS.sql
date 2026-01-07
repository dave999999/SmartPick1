-- =========================================================
-- FIX expire_user_reservations FUNCTION (Correct Columns)
-- =========================================================
-- Updates function to use expires_at instead of pickup_window_end
-- =========================================================

DROP FUNCTION IF EXISTS expire_user_reservations(UUID) CASCADE;

CREATE OR REPLACE FUNCTION expire_user_reservations(p_user_id UUID)
RETURNS TABLE(expired_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Mark user's expired reservations as FAILED_PICKUP
  WITH expired AS (
    UPDATE reservations
    SET status = 'FAILED_PICKUP', updated_at = NOW()
    WHERE user_id = p_user_id
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

COMMENT ON FUNCTION expire_user_reservations IS 
'Expires ACTIVE reservations past expires_at, marks as FAILED_PICKUP, restores quantities, tracks as cancellations';

-- Verify deployment
SELECT 
  'expire_user_reservations' as function_name,
  pg_get_function_arguments(oid) as arguments,
  '✅ Updated with correct columns' as status
FROM pg_proc 
WHERE proname = 'expire_user_reservations';
