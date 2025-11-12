-- ============================================
-- Partner No-Show with No Penalty Option
-- ============================================
-- Allows partners to mark reservations as no-show
-- without penalizing the customer (refunds points)

CREATE OR REPLACE FUNCTION public.partner_mark_no_show_no_penalty(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_user_id UUID := auth.uid();
  v_reservation RECORD;
  v_points_to_refund INT;
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

  -- Get held points to refund
  v_points_to_refund := COALESCE(v_reservation.points_spent, 15);

  -- Refund points to customer (no penalty)
  UPDATE public.users
  SET points_balance = points_balance + v_points_to_refund
  WHERE id = v_reservation.customer_id;

  -- Log transaction
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    description,
    metadata
  ) VALUES (
    v_reservation.customer_id,
    'NO_SHOW_REFUND',
    v_points_to_refund,
    'Points refunded - marked as no-show by partner without penalty',
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'partner_id', v_reservation.partner_id,
      'offer_id', v_reservation.offer_id,
      'marked_by_partner', v_partner_user_id,
      'no_penalty_applied', true
    )
  );

  -- Mark reservation as cancelled (no-show without penalty)
  UPDATE public.reservations
  SET status = 'CANCELLED',
      user_confirmed_pickup = FALSE
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true, 
    'points_refunded', v_points_to_refund,
    'message', 'Reservation marked as no-show without penalty'
  );
END;
$$;

COMMENT ON FUNCTION public.partner_mark_no_show_no_penalty IS 
'Partner marks user as no-show without penalty - refunds points to customer';

GRANT EXECUTE ON FUNCTION public.partner_mark_no_show_no_penalty(UUID) TO authenticated;
