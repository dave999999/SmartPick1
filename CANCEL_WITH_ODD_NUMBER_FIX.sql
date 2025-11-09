-- ESCROW CANCEL WITH PROPER ODD NUMBER HANDLING
-- Handles splits like 5 points → 2 to user, 3 to partner

DROP FUNCTION IF EXISTS public.user_cancel_reservation_split(UUID);

CREATE OR REPLACE FUNCTION public.user_cancel_reservation_split(p_reservation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation RECORD;
  v_escrow RECORD;
  v_customer_balance INT;
  v_partner_balance INT;
  v_customer_refund INT;
  v_partner_portion INT;
  v_has_escrow BOOLEAN;
  v_partner_user_id UUID;
BEGIN
  -- Get reservation
  SELECT * INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  -- Verify ownership
  IF v_reservation.customer_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Check if escrow record exists
  SELECT * INTO v_escrow
  FROM public.escrow_points
  WHERE reservation_id = p_reservation_id
  AND status = 'HELD';

  v_has_escrow := FOUND;

  -- Cancel reservation
  UPDATE public.reservations
  SET status = 'CANCELLED',
      updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Return quantity to offer
  UPDATE public.offers
  SET quantity_available = quantity_available + v_reservation.quantity,
      updated_at = NOW()
  WHERE id = v_reservation.offer_id;

  -- If no escrow, just return success (old reservations)
  IF NOT v_has_escrow THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Reservation cancelled',
      'partner_received', 0,
      'user_refunded', 0
    );
  END IF;

  -- ESCROW EXISTS: Do 50/50 split with proper rounding
  -- Use FLOOR for customer (they get less), CEILING equivalent for partner (they get more)
  v_customer_refund := v_escrow.amount_held / 2;  -- Integer division floors automatically
  v_partner_portion := v_escrow.amount_held - v_customer_refund;  -- Partner gets remainder

  -- Get partner's user_id
  SELECT user_id INTO v_partner_user_id
  FROM public.partners
  WHERE id = v_reservation.partner_id;

  IF v_partner_user_id IS NULL THEN
    RAISE EXCEPTION 'Partner user_id not found';
  END IF;

  -- Get current balances (with defaults)
  SELECT COALESCE(balance, 0) INTO v_customer_balance 
  FROM public.user_points 
  WHERE user_id = v_reservation.customer_id;
  
  IF v_customer_balance IS NULL THEN 
    v_customer_balance := 0; 
  END IF;

  SELECT COALESCE(balance, 0) INTO v_partner_balance 
  FROM public.partner_points 
  WHERE partner_id = v_reservation.partner_id;
  
  IF v_partner_balance IS NULL THEN 
    v_partner_balance := 0; 
  END IF;

  -- Refund 50% to customer
  UPDATE public.user_points
  SET balance = balance + v_customer_refund,
      updated_at = NOW()
  WHERE user_id = v_reservation.customer_id;

  -- Give 50% to partner
  INSERT INTO public.partner_points (partner_id, balance, offer_slots, created_at, updated_at)
  VALUES (v_reservation.partner_id, v_partner_portion, 4, NOW(), NOW())
  ON CONFLICT (partner_id)
  DO UPDATE SET
    balance = partner_points.balance + v_partner_portion,
    updated_at = NOW();

  -- Update escrow status
  UPDATE public.escrow_points
  SET status = 'SPLIT',
      released_at = NOW()
  WHERE id = v_escrow.id;

  -- Log customer transaction
  BEGIN
    INSERT INTO public.point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
    VALUES (
      v_reservation.customer_id,
      v_customer_refund,
      'CANCELLATION_REFUND',
      v_customer_balance,
      v_customer_balance + v_customer_refund,
      json_build_object('reservation_id', p_reservation_id, 'amount_held', v_escrow.amount_held)::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore logging errors
    NULL;
  END;

  -- Log partner transaction
  BEGIN
    INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
    VALUES (
      v_partner_user_id,
      v_partner_portion,
      'CANCELLATION_FEE',
      v_partner_balance,
      v_partner_balance + v_partner_portion,
      json_build_object('reservation_id', p_reservation_id, 'amount_held', v_escrow.amount_held)::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore logging errors
    NULL;
  END;

  RETURN json_build_object(
    'success', true,
    'message', 'Cancelled: ' || v_customer_refund || ' pts to you, ' || v_partner_portion || ' pts to partner',
    'partner_received', v_partner_portion,
    'user_refunded', v_customer_refund
  );
END;
$$;

SELECT 'Function updated with proper odd number handling' as status;
