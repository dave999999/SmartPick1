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
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
BEGIN
  -- Require authenticated user
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Deduct points from user directly (bypassing add_user_points security checks)
  SELECT balance INTO v_current_balance
  FROM user_points
  WHERE user_id = v_customer_id
  FOR UPDATE;

  -- Check if user has enough points
  IF v_current_balance IS NULL OR v_current_balance < v_points_cost THEN
    RAISE EXCEPTION 'Insufficient points. You need % points to make a reservation. Current balance: %', 
      v_points_cost, COALESCE(v_current_balance, 0);
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - v_points_cost;

  -- Update user points
  UPDATE user_points
  SET balance = v_new_balance
  WHERE user_id = v_customer_id;

  -- Log the transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (
    v_customer_id,
    -v_points_cost,
    'RESERVATION_CREATED',
    v_current_balance,
    v_new_balance,
    jsonb_build_object('offer_id', p_offer_id, 'quantity', p_quantity)
  )
  RETURNING id INTO v_transaction_id;

  -- Lock the offer row FOR UPDATE to prevent concurrent modifications
  SELECT * INTO v_offer
  FROM offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Refund points if offer not found
    UPDATE user_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
    VALUES (v_customer_id, v_points_cost, 'RESERVATION_FAILED_REFUND', v_new_balance, v_current_balance, 
            jsonb_build_object('offer_id', p_offer_id, 'reason', 'Offer not found'));
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- Validate offer state/window
  IF v_offer.quantity_available < p_quantity THEN
    -- Refund points if insufficient quantity
    UPDATE user_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
    VALUES (v_customer_id, v_points_cost, 'RESERVATION_FAILED_REFUND', v_new_balance, v_current_balance,
            jsonb_build_object('offer_id', p_offer_id, 'reason', 'Insufficient quantity'));
    RAISE EXCEPTION 'Insufficient quantity available. Only % items left.', v_offer.quantity_available;
  END IF;

  IF v_offer.status != 'ACTIVE' THEN
    -- Refund points if offer not active
    UPDATE user_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
    VALUES (v_customer_id, v_points_cost, 'RESERVATION_FAILED_REFUND', v_new_balance, v_current_balance,
            jsonb_build_object('offer_id', p_offer_id, 'reason', 'Offer not active'));
    RAISE EXCEPTION 'Offer is not active';
  END IF;

  IF v_offer.expires_at <= NOW() THEN
    -- Refund points if offer expired
    UPDATE user_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
    VALUES (v_customer_id, v_points_cost, 'RESERVATION_FAILED_REFUND', v_new_balance, v_current_balance,
            jsonb_build_object('offer_id', p_offer_id, 'reason', 'Offer expired'));
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
    'PENDING',
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
    'status', 'PENDING',
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
