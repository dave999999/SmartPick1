-- Update the CORRECT function (5 parameters, the one actually being called)
CREATE OR REPLACE FUNCTION public.create_reservation_atomic(
  p_offer_id uuid, 
  p_quantity integer, 
  p_qr_code text, 
  p_total_price numeric, 
  p_expires_at timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offer RECORD;
  v_reservation_id UUID;
  v_result JSON;
  v_customer_id UUID;
  v_points_cost INT;
  v_current_balance INT;
  v_new_balance INT;
  v_transaction_id UUID;
  v_active_count INT;
  v_user_status TEXT;
  v_has_penalty BOOLEAN;
  v_max_reservation_quantity INT;
  v_is_partner BOOLEAN;
  v_points_table TEXT;
BEGIN
  -- Require authenticated user
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is an approved partner
  SELECT EXISTS (
    SELECT 1 FROM partners 
    WHERE user_id = v_customer_id 
    AND status = 'APPROVED'
  ) INTO v_is_partner;

  -- Determine which table to use
  IF v_is_partner THEN
    v_points_table := 'partner_points';
  ELSE
    v_points_table := 'user_points';
  END IF;

  -- Check user ban status
  SELECT status, max_reservation_quantity INTO v_user_status, v_max_reservation_quantity
  FROM users
  WHERE id = v_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_user_status = 'BANNED' THEN
    RAISE EXCEPTION 'Your account has been banned due to repeated no-shows. Please contact support.';
  END IF;

  -- Check penalty status
  SELECT EXISTS(
    SELECT 1 FROM user_penalties
    WHERE user_id = v_customer_id 
    AND is_active = true
    FOR UPDATE
  ) INTO v_has_penalty;

  IF v_has_penalty THEN
    RAISE EXCEPTION 'Cannot create reservation: You have an active penalty on your account';
  END IF;

  -- Check active reservation count
  SELECT COUNT(*) INTO v_active_count
  FROM reservations
  WHERE customer_id = v_customer_id 
  AND status = 'ACTIVE';

  IF v_active_count >= 1 THEN
    RAISE EXCEPTION 'You can only have 1 active reservation at a time. Please pick up your current reservation before making a new one.';
  END IF;

  -- Validate quantity
  IF v_max_reservation_quantity IS NULL THEN
    v_max_reservation_quantity := 3;
  END IF;

  IF p_quantity > v_max_reservation_quantity THEN
    RAISE EXCEPTION 'You can reserve up to % items per offer. Unlock more slots in your profile!', v_max_reservation_quantity;
  END IF;

  -- Calculate points cost
  v_points_cost := p_quantity * 5;

  -- Deduct points from appropriate table
  IF v_is_partner THEN
    SELECT balance INTO v_current_balance
    FROM partner_points
    WHERE user_id = v_customer_id
    FOR UPDATE;
  ELSE
    SELECT balance INTO v_current_balance
    FROM user_points
    WHERE user_id = v_customer_id
    FOR UPDATE;
  END IF;

  -- Check if user has enough points
  IF v_current_balance IS NULL OR v_current_balance < v_points_cost THEN
    RAISE EXCEPTION 'Insufficient points. You need % points to reserve % unit(s). Current balance: %', 
      v_points_cost, p_quantity, COALESCE(v_current_balance, 0);
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - v_points_cost;

  -- Update balance in appropriate table
  IF v_is_partner THEN
    UPDATE partner_points
    SET balance = v_new_balance
    WHERE user_id = v_customer_id;
  ELSE
    UPDATE user_points
    SET balance = v_new_balance
    WHERE user_id = v_customer_id;
  END IF;

  -- Log the transaction
  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (
    v_customer_id,
    -v_points_cost,
    'RESERVATION_CREATED',
    v_current_balance,
    v_new_balance,
    jsonb_build_object(
      'offer_id', p_offer_id, 
      'quantity', p_quantity, 
      'points_per_unit', 5,
      'is_partner', v_is_partner,
      'table_used', v_points_table
    )
  )
  RETURNING id INTO v_transaction_id;

  -- Lock the offer
  SELECT * INTO v_offer
  FROM offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Refund points
    IF v_is_partner THEN
      UPDATE partner_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    ELSE
      UPDATE user_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    END IF;
    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
    VALUES (v_customer_id, v_points_cost, 'RESERVATION_FAILED_REFUND', v_new_balance, v_current_balance, 
            jsonb_build_object('offer_id', p_offer_id, 'reason', 'Offer not found'));
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- Validate offer
  IF v_offer.quantity_available < p_quantity THEN
    IF v_is_partner THEN
      UPDATE partner_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    ELSE
      UPDATE user_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    END IF;
    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
    VALUES (v_customer_id, v_points_cost, 'RESERVATION_FAILED_REFUND', v_new_balance, v_current_balance,
            jsonb_build_object('offer_id', p_offer_id, 'reason', 'Insufficient quantity'));
    RAISE EXCEPTION 'Insufficient quantity available. Only % items left.', v_offer.quantity_available;
  END IF;

  IF v_offer.status != 'ACTIVE' THEN
    IF v_is_partner THEN
      UPDATE partner_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    ELSE
      UPDATE user_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    END IF;
    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
    VALUES (v_customer_id, v_points_cost, 'RESERVATION_FAILED_REFUND', v_new_balance, v_current_balance,
            jsonb_build_object('offer_id', p_offer_id, 'reason', 'Offer not active'));
    RAISE EXCEPTION 'Offer is not active';
  END IF;

  IF v_offer.expires_at <= NOW() THEN
    IF v_is_partner THEN
      UPDATE partner_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    ELSE
      UPDATE user_points SET balance = balance + v_points_cost WHERE user_id = v_customer_id;
    END IF;
    INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
    VALUES (v_customer_id, v_points_cost, 'RESERVATION_FAILED_REFUND', v_new_balance, v_current_balance,
            jsonb_build_object('offer_id', p_offer_id, 'reason', 'Offer expired'));
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  -- Update offer quantity
  UPDATE offers
  SET quantity_available = quantity_available - p_quantity
  WHERE id = p_offer_id;

  -- Create reservation
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

  -- Return result
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
$function$;

SELECT 'Correct function updated!' as status;
