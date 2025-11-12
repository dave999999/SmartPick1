-- CANCEL RESERVATION WITH FULL PENALTY
-- User cancels = ALL POINTS LOST FOREVER (no refund, no partner split)
-- This discourages cancellations and no-shows

BEGIN;

CREATE OR REPLACE FUNCTION public.user_cancel_reservation_split(p_reservation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_reservation RECORD;
  v_points_lost INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get reservation details
  SELECT r.*
  INTO v_reservation
  FROM public.reservations r
  WHERE r.id = p_reservation_id
    AND r.customer_id = v_user_id;

  IF v_reservation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation not found or not authorized');
  END IF;

  -- Must be ACTIVE (not yet picked up)
  IF v_reservation.status != 'ACTIVE' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot cancel: reservation is ' || v_reservation.status);
  END IF;

  -- Calculate points that will be lost forever
  v_points_lost := COALESCE(v_reservation.points_spent, GREATEST(0, COALESCE(v_reservation.quantity, 0) * 5));

  -- Log the penalty transaction (negative, no refund)
  INSERT INTO public.point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  SELECT v_user_id, 
         0,  -- No change to balance (points already spent)
         'CANCELLATION_PENALTY',
         balance, 
         balance,
         jsonb_build_object(
           'reservation_id', p_reservation_id, 
           'offer_id', v_reservation.offer_id,
           'points_lost', v_points_lost,
           'penalty_type', 'user_cancelled'
         )
  FROM public.user_points 
  WHERE user_id = v_user_id;

  -- Restore offer quantity (at least let others reserve)
  UPDATE public.offers
  SET quantity_available = quantity_available + v_reservation.quantity, updated_at = NOW()
  WHERE id = v_reservation.offer_id;

  -- Mark as cancelled
  UPDATE public.reservations
  SET status = 'CANCELLED', updated_at = NOW()
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reservation cancelled. All points lost as penalty.',
    'partner_received', 0,
    'user_refunded', 0,
    'points_lost', v_points_lost
  );
END;
$$;

COMMENT ON FUNCTION public.user_cancel_reservation_split IS 'User cancels reservation - ALL POINTS LOST FOREVER as penalty (no refund)';

COMMIT;
