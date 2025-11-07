-- Secure create_reservation_atomic: derive customer_id from auth.uid() instead of client-supplied param
-- This replaces the previous version that accepted p_customer_id to prevent impersonation.

CREATE OR REPLACE FUNCTION create_reservation_atomic(
  p_offer_id UUID,
  p_quantity INTEGER,
  p_qr_code TEXT,
  p_total_price NUMERIC,
  p_expires_at TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer RECORD;
  v_reservation_id UUID;
  v_result JSON;
  v_customer_id UUID;
BEGIN
  -- Require authenticated user
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lock the offer row FOR UPDATE to prevent concurrent modifications
  SELECT * INTO v_offer
  FROM offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- Validate offer state/window
  IF v_offer.quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity available. Only % items left.', v_offer.quantity_available;
  END IF;

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
    v_customer_id,
    v_offer.partner_id,
    p_qr_code,
    p_quantity,
    p_total_price,
    'ACTIVE',
    p_expires_at
  )
  RETURNING id INTO v_reservation_id;

  -- Return a JSON payload
  SELECT json_build_object(
    'id', v_reservation_id,
    'offer_id', p_offer_id,
    'customer_id', v_customer_id,
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

COMMENT ON FUNCTION create_reservation_atomic IS
  'Atomically creates a reservation and decrements offer quantity. Customer is derived from auth.uid() to prevent impersonation.';

GRANT EXECUTE ON FUNCTION create_reservation_atomic TO authenticated;
