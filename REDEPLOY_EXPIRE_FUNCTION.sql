-- =========================================================
-- REDEPLOY CORRECT expire_user_reservations FUNCTION
-- =========================================================

DROP FUNCTION IF EXISTS expire_user_reservations(UUID) CASCADE;

CREATE OR REPLACE FUNCTION expire_user_reservations(p_user_id UUID)
RETURNS TABLE(expired_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
  v_missed_pickup_count INTEGER;
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
  , tracked AS (
    -- Track as MISSED PICKUPS (not cancellations!)
    INSERT INTO user_missed_pickups (user_id, reservation_id, created_at)
    SELECT p_user_id, e.id, NOW()
    FROM expired e
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_count FROM expired;
  
  -- Count total missed pickups to set warning level
  IF v_count > 0 THEN
    SELECT COUNT(*) INTO v_missed_pickup_count
    FROM user_missed_pickups
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '30 days';
    
    -- Update warning level for newly added records
    UPDATE user_missed_pickups
    SET warning_level = v_missed_pickup_count
    WHERE user_id = p_user_id
      AND warning_level IS NULL;
  END IF;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION expire_user_reservations(UUID) TO authenticated;

COMMENT ON FUNCTION expire_user_reservations IS 
'Expires ACTIVE reservations, marks as FAILED_PICKUP, tracks as MISSED PICKUPS (separate from cancellations)';

-- Verify deployment
SELECT 'Function redeployed!' as status;
