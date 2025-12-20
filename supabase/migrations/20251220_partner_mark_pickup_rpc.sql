-- Simple RPC function for marking reservation as picked up
-- Replacement for the old partner_mark_as_picked_up function

-- Drop existing function if it has different return type
DROP FUNCTION IF EXISTS partner_mark_reservation_picked_up(UUID);

CREATE OR REPLACE FUNCTION partner_mark_reservation_picked_up(
  p_reservation_id UUID
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  picked_up_at TIMESTAMPTZ,
  customer_id UUID,
  partner_id UUID,
  offer_id UUID,
  quantity INT,
  qr_code TEXT,
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
  v_offer RECORD;
  v_points_to_award INT;
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

  -- Get offer details for points calculation
  SELECT * INTO v_offer FROM offers WHERE offers.id = v_reservation.offer_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- Calculate points to award (smart_price * quantity)
  v_points_to_award := v_offer.smart_price * v_reservation.quantity;

  -- Temporarily disable the trigger to prevent it from also trying to award points
  -- Our function will handle the points transfer directly
  ALTER TABLE reservations DISABLE TRIGGER trg_transfer_points_to_partner;

  -- Update the reservation status
  UPDATE reservations
  SET 
    status = 'PICKED_UP',
    picked_up_at = NOW()
  WHERE reservations.id = p_reservation_id;

  -- Re-enable the trigger for future updates
  ALTER TABLE reservations ENABLE TRIGGER trg_transfer_points_to_partner;

  -- Award points to partner using add_partner_points (has SECURITY DEFINER, no permission check)
  PERFORM add_partner_points(
    v_partner_id,
    v_points_to_award,
    'Reservation picked up',
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'offer_id', v_reservation.offer_id,
      'source', 'pickup'
    )
  );

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

-- Grant permission
GRANT EXECUTE ON FUNCTION partner_mark_reservation_picked_up TO authenticated;

COMMENT ON FUNCTION partner_mark_reservation_picked_up IS 'Mark reservation as picked up - alternative to Edge Function';
