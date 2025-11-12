-- ============================================
-- Partner Confirm No-Show (Keep Penalty)
-- ============================================
-- Partner confirms no-show, penalty already applied by auto-expiration system
-- This just cleans up and restores quantity

CREATE OR REPLACE FUNCTION public.partner_confirm_no_show(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_user_id UUID := auth.uid();
  v_reservation RECORD;
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

  -- Must be ACTIVE or FAILED_PICKUP (expired/failed reservation)
  IF v_reservation.status NOT IN ('ACTIVE', 'FAILED_PICKUP') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation already processed');
  END IF;

  -- Restore offer quantity (if not already restored by auto-expiration)
  UPDATE public.offers
  SET quantity_available = quantity_available + v_reservation.quantity,
      updated_at = NOW()
  WHERE id = v_reservation.offer_id;

  -- Mark reservation as processed
  UPDATE public.reservations
  SET status = 'FAILED_PICKUP',
      user_confirmed_pickup = FALSE
  WHERE id = p_reservation_id;

  -- Penalty is already applied by auto-expiration system
  -- Partner is just confirming and cleaning up

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'No-show confirmed, penalty kept'
  );
END;
$$;

COMMENT ON FUNCTION public.partner_confirm_no_show IS 
'Partner confirms no-show reservation, keeps penalty that was auto-applied by system';

GRANT EXECUTE ON FUNCTION public.partner_confirm_no_show(UUID) TO authenticated;
