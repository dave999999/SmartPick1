-- Create atomic reservation function to prevent race conditions
-- This function handles the entire reservation creation in a single database transaction

CREATE OR REPLACE FUNCTION create_reservation_atomic(
  p_offer_id UUID,
  p_customer_id UUID,
  p_quantity INTEGER,
  p_qr_code TEXT,
  p_total_price NUMERIC,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
DECLARE
  v_offer RECORD;
  v_reservation_id UUID;
  v_result JSON;
BEGIN
  -- Lock the offer row FOR UPDATE to prevent concurrent modifications
  SELECT * INTO v_offer
  FROM offers
  WHERE id = p_offer_id
  FOR UPDATE; -- This creates a row-level lock

  -- Check if offer exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- Check if offer has enough quantity
  IF v_offer.quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity available. Only % items left.', v_offer.quantity_available;
  END IF;

  -- Check if offer is active and not expired
  IF v_offer.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Offer is not active';
  END IF;

  IF v_offer.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  -- Update offer quantity atomically
  UPDATE offers
  SET quantity_available = quantity_available - p_quantity
  WHERE id = p_offer_id;

  -- Create the reservation
  INSERT INTO reservations (
    offer_id,
    customer_id,
    partner_id,
    qr_code,
    quantity,
    total_price,
    status,
    expires_at
  )
  VALUES (
    p_offer_id,
    p_customer_id,
    v_offer.partner_id,
    p_qr_code,
    p_quantity,
    p_total_price,
    'ACTIVE',
    p_expires_at
  )
  RETURNING id INTO v_reservation_id;

  -- Return the reservation ID
  SELECT json_build_object(
    'id', v_reservation_id,
    'offer_id', p_offer_id,
    'customer_id', p_customer_id,
    'partner_id', v_offer.partner_id,
    'qr_code', p_qr_code,
    'quantity', p_quantity,
    'total_price', p_total_price,
    'status', 'ACTIVE',
    'expires_at', p_expires_at,
    'created_at', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Add comment
COMMENT ON FUNCTION create_reservation_atomic IS
  'Atomically creates a reservation and decrements offer quantity. '
  'Prevents race conditions through row-level locking.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_reservation_atomic TO authenticated;
