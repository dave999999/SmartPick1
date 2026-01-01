-- =====================================================
-- FIX: Partner Pickup Function Return Type Mismatch
-- The function return types don't match the actual table column types
-- =====================================================

DROP FUNCTION IF EXISTS partner_mark_reservation_picked_up(UUID) CASCADE;

CREATE OR REPLACE FUNCTION partner_mark_reservation_picked_up(
  p_reservation_id UUID
)
RETURNS TABLE (
  id UUID,
  status VARCHAR(20),         -- FIXED: was VARCHAR(50), table has VARCHAR(20)
  picked_up_at TIMESTAMPTZ,
  customer_id UUID,
  partner_id UUID,
  offer_id UUID,
  quantity INT,
  qr_code VARCHAR(50),        -- FIXED: was VARCHAR(500), table has VARCHAR(50)
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  user_confirmed_pickup BOOLEAN,
  points_spent INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
  v_reservation RECORD;
  v_current_user_id UUID;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Get current user's partner ID
  SELECT p.id INTO v_partner_id 
  FROM partners p
  WHERE p.user_id = v_current_user_id;
  
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'User is not a partner';
  END IF;

  -- Get the reservation and verify ownership
  SELECT * INTO v_reservation
  FROM reservations r
  WHERE r.id = p_reservation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;
  
  -- Verify partner owns this reservation
  IF v_reservation.partner_id != v_partner_id THEN
    RAISE EXCEPTION 'Access denied: Reservation does not belong to this partner';
  END IF;
  
  -- Check if status is ACTIVE
  IF v_reservation.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Invalid status: Reservation is % (must be ACTIVE)', v_reservation.status;
  END IF;

  -- Simple update - the trigger will handle points transfer correctly now
  UPDATE reservations
  SET 
    status = 'PICKED_UP',
    picked_up_at = NOW()
  WHERE reservations.id = p_reservation_id;

  -- Return the updated reservation
  RETURN QUERY
  SELECT 
    r.id,
    r.status,
    r.picked_up_at,
    r.customer_id,
    r.partner_id,
    r.offer_id,
    r.quantity,
    r.qr_code,
    r.expires_at,
    r.created_at,
    r.user_confirmed_pickup,
    r.points_spent
  FROM reservations r
  WHERE r.id = p_reservation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION partner_mark_reservation_picked_up TO authenticated;

COMMENT ON FUNCTION partner_mark_reservation_picked_up IS 
'Mark reservation as picked up. The trigger handles points transfer to partner_points (unified wallet system).';

SELECT '✅ Partner pickup function return types fixed!' as status;
