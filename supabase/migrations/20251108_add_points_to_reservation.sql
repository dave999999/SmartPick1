-- Add points deduction to create_reservation_atomic
-- Users must spend 15 points to create a reservation

BEGIN;

CREATE OR REPLACE FUNCTION public.create_reservation_atomic(
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
  v_points_cost INT := 15; -- Cost to make a reservation
  v_points_result JSONB;
BEGIN
  -- Require authenticated user
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Deduct points from user (15 points per reservation)
  v_points_result := public.add_user_points(
    v_customer_id,
    -v_points_cost,
    'RESERVATION_CREATED',
    jsonb_build_object('offer_id', p_offer_id, 'quantity', p_quantity)
  );

  -- Check if points deduction was successful
  IF NOT (v_points_result->>'success')::boolean THEN
    RAISE EXCEPTION 'Failed to deduct points: %', v_points_result->>'message';
  END IF;

  -- Lock the offer row FOR UPDATE to prevent concurrent modifications
  SELECT * INTO v_offer
  FROM offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Refund points if offer not found
    PERFORM public.add_user_points(
      v_customer_id,
      v_points_cost,
      'RESERVATION_FAILED_REFUND',
      jsonb_build_object('offer_id', p_offer_id, 'reason', 'Offer not found')
    );
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- Validate offer state/window
  IF v_offer.quantity_available < p_quantity THEN
    -- Refund points if insufficient quantity
    PERFORM public.add_user_points(
      v_customer_id,
      v_points_cost,
      'RESERVATION_FAILED_REFUND',
      jsonb_build_object('offer_id', p_offer_id, 'reason', 'Insufficient quantity')
    );
    RAISE EXCEPTION 'Insufficient quantity available. Only % items left.', v_offer.quantity_available;
  END IF;

  IF v_offer.status != 'ACTIVE' THEN
    -- Refund points if offer not active
    PERFORM public.add_user_points(
      v_customer_id,
      v_points_cost,
      'RESERVATION_FAILED_REFUND',
      jsonb_build_object('offer_id', p_offer_id, 'reason', 'Offer not active')
    );
    RAISE EXCEPTION 'Offer is not active';
  END IF;

  IF v_offer.expires_at <= NOW() THEN
    -- Refund points if offer expired
    PERFORM public.add_user_points(
      v_customer_id,
      v_points_cost,
      'RESERVATION_FAILED_REFUND',
      jsonb_build_object('offer_id', p_offer_id, 'reason', 'Offer expired')
    );
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  -- Update offer quantity atomically
  UPDATE offers
  SET quantity_available = quantity_available - p_quantity
  WHERE id = p_offer_id;

  -- Create the reservation with points_spent tracked
  INSERT INTO reservations (
    offer_id,
    customer_id,
    partner_id,
    qr_code,
    quantity,
    total_price,
    status,
    expires_at,
    points_spent
  )
  VALUES (
    p_offer_id,
    v_customer_id,
    v_offer.partner_id,
    p_qr_code,
    p_quantity,
    p_total_price,
    'ACTIVE',
    p_expires_at,
    v_points_cost
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
    'points_spent', v_points_cost,
    'created_at', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.create_reservation_atomic(UUID, INTEGER, TEXT, NUMERIC, TIMESTAMPTZ) IS
  'Atomically creates a reservation, decrements offer quantity, and deducts 15 points from user. Refunds points if reservation fails.';

COMMIT;
