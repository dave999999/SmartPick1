-- EMERGENCY: Simple cancel without escrow
-- This will just cancel the reservation and return quantity

DROP FUNCTION IF EXISTS public.user_cancel_reservation_split(UUID);

CREATE OR REPLACE FUNCTION public.user_cancel_reservation_split(p_reservation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation RECORD;
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

  RETURN json_build_object(
    'success', true,
    'message', 'Reservation cancelled successfully',
    'partner_received', 0,
    'user_refunded', 0
  );
END;
$$;

COMMENT ON FUNCTION public.user_cancel_reservation_split IS 'Emergency cancel - no escrow (temporary)';
