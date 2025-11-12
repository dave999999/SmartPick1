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
  v_penalty_increment BOOLEAN := FALSE;
BEGIN
  IF v_partner_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  SELECT r.* INTO v_reservation
  FROM public.reservations r
  JOIN public.partners p ON p.id = r.partner_id
  WHERE r.id = p_reservation_id
    AND p.user_id = v_partner_user_id
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation not found');
  END IF;

  -- If still ACTIVE and expired, apply failed pickup logic now
  IF v_reservation.status = 'ACTIVE' AND v_reservation.expires_at < NOW() THEN
    UPDATE public.reservations
    SET status = 'FAILED_PICKUP', updated_at = NOW()
    WHERE id = p_reservation_id;

    UPDATE public.offers
    SET quantity_available = quantity_available + v_reservation.quantity,
        updated_at = NOW()
    WHERE id = v_reservation.offer_id;

    UPDATE public.users
    SET penalty_count = COALESCE(penalty_count,0) + 1
    WHERE id = v_reservation.customer_id;
    v_penalty_increment := TRUE;
  ELSIF v_reservation.status = 'FAILED_PICKUP' THEN
    -- Already processed by system; do not restore quantity or re-penalize
    NULL;
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Reservation already processed');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN v_penalty_increment THEN 'No-show confirmed (penalty applied now)' ELSE 'No-show confirmed (system already applied penalty)' END
  );
END;
$$;

COMMENT ON FUNCTION public.partner_confirm_no_show IS 'Partner confirms no-show; if system not yet processed, applies penalty & restores quantity; otherwise acknowledges.';

GRANT EXECUTE ON FUNCTION public.partner_confirm_no_show(UUID) TO authenticated;
