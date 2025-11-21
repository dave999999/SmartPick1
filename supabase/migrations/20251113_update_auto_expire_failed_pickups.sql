-- Patch migration: update auto_expire_failed_pickups function to simplified logic
-- Date: 2025-11-13
-- Note: Previous migration file was edited in-place; this patch ensures the database receives the new definition even if the original migration already ran.

CREATE OR REPLACE FUNCTION auto_expire_failed_pickups()
RETURNS TABLE(reservation_id UUID, user_id UUID, penalty_applied BOOLEAN, message TEXT) AS $$
DECLARE
  v_rec RECORD;
  v_new_count INT;
BEGIN
  FOR v_rec IN 
    SELECT r.id AS res_id, r.customer_id, u.penalty_count, r.quantity, r.offer_id
    FROM reservations r
    JOIN users u ON u.id = r.customer_id
    WHERE r.status = 'ACTIVE'
      AND r.expires_at < NOW()
  LOOP
    -- Mark as failed pickup
    UPDATE reservations SET status = 'FAILED_PICKUP', updated_at = NOW() WHERE id = v_rec.res_id;
    -- Increment simple penalty counter
    UPDATE users SET penalty_count = COALESCE(penalty_count,0) + 1 WHERE id = v_rec.customer_id RETURNING penalty_count INTO v_new_count;
    -- Restore offer quantity (single restoration path; partner_confirm_no_show must skip if status already FAILED_PICKUP)
    UPDATE offers SET quantity_available = quantity_available + v_rec.quantity, updated_at = NOW() WHERE id = v_rec.offer_id;
    reservation_id := v_rec.res_id;
    user_id := v_rec.customer_id;
    penalty_applied := TRUE;
    message := format('Failed pickup processed. Penalty count now %s', v_new_count);
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_expire_failed_pickups IS 'Simplified: marks expired ACTIVE reservations as FAILED_PICKUP, increments penalty_count, restores quantity.';
