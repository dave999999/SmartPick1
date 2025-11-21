-- Updated function with better error messages
CREATE OR REPLACE FUNCTION partner_mark_as_picked_up(p_reservation_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
  v_partner_user_id UUID;
  v_customer_id UUID;
  v_reservation RECORD;
  v_current_user_id UUID;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  -- Get current user's partner ID
  SELECT id INTO v_partner_id 
  FROM partners 
  WHERE user_id = v_current_user_id;
  
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'User % is not a partner', v_current_user_id;
  END IF;

  -- Get the reservation and verify ownership
  SELECT * INTO v_reservation
  FROM reservations
  WHERE id = p_reservation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation % not found', p_reservation_id;
  END IF;
  
  -- Check if partner owns this reservation
  IF v_reservation.partner_id != v_partner_id THEN
    RAISE EXCEPTION 'Reservation % is not owned by partner % (actual owner: %)', 
      p_reservation_id, v_partner_id, v_reservation.partner_id;
  END IF;
  
  -- Check if status is ACTIVE
  IF v_reservation.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Reservation % status is % (must be ACTIVE)', 
      p_reservation_id, v_reservation.status;
  END IF;

  -- Clear any penalties for the customer
  UPDATE user_points
  SET penalty = 0
  WHERE user_id = v_reservation.customer_id
  AND penalty > 0;

  -- Update the reservation status
  UPDATE reservations
  SET 
    status = 'PICKED_UP',
    picked_up_at = NOW()
  WHERE id = p_reservation_id;

  -- Return the updated reservation
  RETURN jsonb_build_object(
    'id', p_reservation_id,
    'status', 'PICKED_UP',
    'picked_up_at', NOW(),
    'message', 'Successfully marked as picked up'
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION partner_mark_as_picked_up(UUID) TO authenticated;
