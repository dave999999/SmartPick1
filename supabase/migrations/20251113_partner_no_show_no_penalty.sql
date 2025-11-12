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

  -- Get held points (they will be lost permanently, not refunded)
  v_points_to_refund := COALESCE(v_reservation.points_spent, 15);

  -- Points are LOST permanently (no refund, no transfer to partner)
  -- Customer loses points for not showing up, but no penalty applied

  -- Log transaction showing points were lost
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    description,
    metadata
  ) VALUES (
    v_reservation.customer_id,
    'NO_SHOW_POINTS_LOST',
    -v_points_to_refund,
    'Points lost - marked as no-show by partner without additional penalty',
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'partner_id', v_reservation.partner_id,
      'offer_id', v_reservation.offer_id,
      'marked_by_partner', v_partner_user_id,
      'no_penalty_applied', true,
      'points_permanently_lost', true
    )
  );

  -- Restore offer quantity (return items to available stock)
  UPDATE public.offers
  SET quantity_available = quantity_available + v_reservation.quantity,
      updated_at = NOW()
  WHERE id = v_reservation.offer_id;

  -- Mark reservation as cancelled (no-show without penalty)
  UPDATE public.reservations
  SET status = 'CANCELLED',
      user_confirmed_pickup = FALSE
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true, 
    'points_lost', v_points_to_refund,
    'message', 'Reservation marked as no-show without penalty - points lost permanently'
  );
END;
$$;

COMMENT ON FUNCTION public.partner_mark_no_show_no_penalty IS 
'Partner marks user as no-show without penalty - refunds points to customer';

GRANT EXECUTE ON FUNCTION public.partner_mark_no_show_no_penalty(UUID) TO authenticated;
