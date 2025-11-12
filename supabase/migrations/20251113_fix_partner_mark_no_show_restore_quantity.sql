-- ============================================
-- Fix partner_mark_no_show to restore quantity
-- ============================================
-- When partner marks no-show, restore the reserved quantity back to offer

CREATE OR REPLACE FUNCTION public.partner_mark_no_show(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_user_id UUID := auth.uid();
  v_reservation RECORD;
  v_points_to_transfer INT;
BEGIN
  IF v_partner_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get reservation details
  SELECT r.* INTO v_reservation
  FROM public.reservations r
  JOIN public.partners p ON p.id = r.partner_id
  WHERE r.id = p_reservation_id
    AND p.user_id = v_partner_user_id
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation not found');
  END IF;

  -- Must be ACTIVE (user never showed up)
  IF v_reservation.status != 'ACTIVE' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation not active');
  END IF;

  -- Get held points
  v_points_to_transfer := COALESCE(v_reservation.points_spent, 15);

  -- Transfer points to partner as penalty
  PERFORM public.add_partner_points(
    v_partner_user_id,
    v_points_to_transfer,
    'NO_SHOW_PENALTY',
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'user_id', v_reservation.customer_id,
      'offer_id', v_reservation.offer_id
    )
  );

  -- Restore offer quantity (return items to available stock)
  UPDATE public.offers
  SET quantity_available = quantity_available + v_reservation.quantity,
      updated_at = NOW()
  WHERE id = v_reservation.offer_id;

  -- Mark reservation as no-show (use CANCELLED status with metadata)
  UPDATE public.reservations
  SET status = 'CANCELLED',
      user_confirmed_pickup = FALSE
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object('success', true, 'points_transferred', v_points_to_transfer);
END;
$$;

COMMENT ON FUNCTION public.partner_mark_no_show IS 'Partner marks user as no-show, transfers held points as penalty, restores offer quantity';
