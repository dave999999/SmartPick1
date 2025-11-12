-- ============================================
-- Partner Forgive Customer (Remove Penalty)
-- ============================================
-- Partner decides to forgive the customer and remove the penalty
-- that was automatically applied by the system

CREATE OR REPLACE FUNCTION public.partner_forgive_customer(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_user_id UUID := auth.uid();
  v_reservation RECORD;
  v_customer_record RECORD;
  v_penalty_count INT;
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

  -- Get customer's current penalty info
  SELECT penalty_count, banned_until INTO v_customer_record
  FROM public.users
  WHERE id = v_reservation.customer_id;

  v_penalty_count := COALESCE(v_customer_record.penalty_count, 0);

  -- REMOVE the penalty that was applied (forgive customer)
  IF v_penalty_count > 0 THEN
    UPDATE public.users
    SET penalty_count = GREATEST(0, penalty_count - 1),
        banned_until = CASE 
          WHEN penalty_count - 1 = 0 THEN NULL  -- No more penalties, remove ban
          WHEN penalty_count - 1 = 1 THEN NOW() + INTERVAL '1 hour'  -- Back to 1hr ban
          ELSE banned_until  -- Keep current ban if still has multiple penalties
        END
    WHERE id = v_reservation.customer_id;
    
    -- Remove from user_bans table if exists
    DELETE FROM public.user_bans
    WHERE user_id = v_reservation.customer_id;
  END IF;

  -- Log that partner forgave the customer
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    description,
    metadata
  ) VALUES (
    v_reservation.customer_id,
    'PENALTY_FORGIVEN',
    0,
    'Partner decided not to penalize you for this no-show',
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'partner_id', v_reservation.partner_id,
      'offer_id', v_reservation.offer_id,
      'forgiven_by_partner', v_partner_user_id,
      'previous_penalty_count', v_penalty_count,
      'new_penalty_count', GREATEST(0, v_penalty_count - 1)
    )
  );

  -- Restore offer quantity (if not already restored by auto-expiration)
  UPDATE public.offers
  SET quantity_available = quantity_available + v_reservation.quantity,
      updated_at = NOW()
  WHERE id = v_reservation.offer_id;

  -- Mark reservation as cancelled (forgiven)
  UPDATE public.reservations
  SET status = 'CANCELLED',
      user_confirmed_pickup = FALSE
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Customer forgiven - penalty removed',
    'penalty_removed', true
  );
END;
$$;

COMMENT ON FUNCTION public.partner_forgive_customer IS 
'Partner forgives customer and removes penalty that was auto-applied by system';

GRANT EXECUTE ON FUNCTION public.partner_forgive_customer(UUID) TO authenticated;
