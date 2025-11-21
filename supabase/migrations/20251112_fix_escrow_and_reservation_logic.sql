-- Align reservation + escrow flows to avoid double charges and wrong wallet entries
-- Changes:
-- 1) Update hold_points_on_reservation() to use NEW.points_spent instead of rounding total_price
-- 2) Update create_reservation_atomic(...) to only validate balance and insert reservation; no direct deductions/logs
--    The AFTER INSERT trigger will hold points and log RESERVATION_HOLD.

BEGIN;

-- 1) Update hold_points_on_reservation to use points_spent
CREATE OR REPLACE FUNCTION public.hold_points_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points_to_hold INT;
  v_customer_balance INT;
  v_partner_user_id UUID;
BEGIN
  -- Only process if reservation is ACTIVE
  IF NEW.status != 'ACTIVE' THEN
    RETURN NEW;
  END IF;

  -- Use points_spent recorded by the reservation function (e.g., quantity * 5)
  v_points_to_hold := COALESCE(NEW.points_spent, 0);

  IF v_points_to_hold <= 0 THEN
    -- Nothing to hold
    RETURN NEW;
  END IF;

  -- Get customer's current balance
  SELECT balance INTO v_customer_balance
  FROM public.user_points
  WHERE user_id = NEW.customer_id
  FOR UPDATE;

  -- Get partner's user_id
  SELECT user_id INTO v_partner_user_id
  FROM public.partners
  WHERE id = NEW.partner_id;

  -- Deduct points from customer's balance
  UPDATE public.user_points
  SET balance = balance - v_points_to_hold,
      updated_at = NOW()
  WHERE user_id = NEW.customer_id;

  -- Create escrow record
  INSERT INTO public.escrow_points (
    reservation_id,
    customer_id,
    partner_id,
    amount_held,
    status
  ) VALUES (
    NEW.id,
    NEW.customer_id,
    v_partner_user_id,
    v_points_to_hold,
    'HELD'
  );

  -- Log transaction (user wallet)
  INSERT INTO public.point_transactions (
    user_id,
    change,
    reason,
    balance_before,
    balance_after,
    metadata
  ) VALUES (
    NEW.customer_id,
    -v_points_to_hold,
    'RESERVATION_HOLD',
    v_customer_balance,
    v_customer_balance - v_points_to_hold,
    json_build_object('reservation_id', NEW.id, 'offer_id', NEW.offer_id, 'quantity', NEW.quantity)::jsonb
  );

  RETURN NEW;
END;
$$;

-- 2) Update create_reservation_atomic to validate only; no direct point deduction/logging
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
  v_points_cost INT;
  v_current_balance INT;
BEGIN
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Calculate points: 5 points per unit
  v_points_cost := GREATEST(1, p_quantity) * 5;

  -- Lock and check user balance (do not deduct here)
  SELECT balance INTO v_current_balance
  FROM public.user_points
  WHERE user_id = v_customer_id
  FOR UPDATE;

  IF v_current_balance IS NULL OR v_current_balance < v_points_cost THEN
    RAISE EXCEPTION 'Insufficient points. You need % points to reserve % unit(s). Current balance: %',
      v_points_cost, p_quantity, COALESCE(v_current_balance, 0);
  END IF;

  -- Lock the offer row FOR UPDATE to prevent concurrent modifications
  SELECT * INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  IF v_offer.quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient quantity available. Only % items left.', v_offer.quantity_available;
  END IF;

  IF v_offer.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Offer is not active';
  END IF;

  IF v_offer.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  -- Update offer quantity
  UPDATE public.offers
  SET quantity_available = quantity_available - p_quantity
  WHERE id = p_offer_id;

  -- Create reservation; store points_spent for triggers to use
  INSERT INTO public.reservations (
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

  -- Return JSON
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

COMMIT;
