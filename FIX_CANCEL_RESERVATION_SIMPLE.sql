-- TEMPORARY FIX: Replace user_cancel_reservation_split with simpler version
-- This cancels without point splitting (until escrow system is set up)

CREATE OR REPLACE FUNCTION public.user_cancel_reservation_split(p_reservation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
  v_offer_id UUID;
  v_quantity INT;
  v_partner_id UUID;
BEGIN
  -- Get reservation details
  SELECT customer_id, offer_id, quantity, partner_id
  INTO v_customer_id, v_offer_id, v_quantity, v_partner_id
  FROM public.reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  -- Verify the caller owns this reservation
  IF v_customer_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to cancel this reservation';
  END IF;

  -- Update reservation status to CANCELLED
  UPDATE public.reservations
  SET status = 'CANCELLED',
      updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Return quantity back to offer
  UPDATE public.offers
  SET quantity_available = quantity_available + v_quantity,
      updated_at = NOW()
  WHERE id = v_offer_id;

  -- Return success (no points split for now)
  RETURN json_build_object(
    'success', true,
    'message', 'Reservation cancelled successfully',
    'partner_received', 0,
    'user_refunded', 0
  );
END;
$$;

COMMENT ON FUNCTION public.user_cancel_reservation_split IS 'Cancel reservation (simplified - no point escrow)';
