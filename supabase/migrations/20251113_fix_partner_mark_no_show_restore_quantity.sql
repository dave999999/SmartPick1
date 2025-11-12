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
  v_points_lost INT;
  v_penalty_count INT;
  v_ban_duration INTERVAL;
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

  -- Get held points (they will be LOST permanently, not transferred)
  v_points_lost := COALESCE(v_reservation.points_spent, 15);

  -- Apply penalty: increment penalty count
  UPDATE public.users
  SET penalty_count = COALESCE(penalty_count, 0) + 1
  WHERE id = v_reservation.customer_id
  RETURNING penalty_count INTO v_penalty_count;

  -- Calculate ban duration based on offense count
  IF v_penalty_count = 1 THEN
    v_ban_duration := INTERVAL '1 hour';
  ELSIF v_penalty_count = 2 THEN
    v_ban_duration := INTERVAL '24 hours';
  ELSE
    -- Permanent ban (100 years) for 3+ offenses
    v_ban_duration := INTERVAL '100 years';
    
    -- Insert into user_bans table for permanent ban
    INSERT INTO public.user_bans (
      user_id,
      reason,
      banned_until,
      metadata
    ) VALUES (
      v_reservation.customer_id,
      'Third failed pickup - permanent ban',
      NOW() + v_ban_duration,
      jsonb_build_object(
        'reservation_id', p_reservation_id,
        'offer_id', v_reservation.offer_id,
        'penalty_count', v_penalty_count
      )
    ) ON CONFLICT (user_id) DO UPDATE
    SET banned_until = GREATEST(user_bans.banned_until, EXCLUDED.banned_until),
        updated_at = NOW();
  END IF;

  -- Update user's banned_until timestamp
  UPDATE public.users
  SET banned_until = NOW() + v_ban_duration
  WHERE id = v_reservation.customer_id;

  -- Log transaction showing points were lost with penalty
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    description,
    metadata
  ) VALUES (
    v_reservation.customer_id,
    'NO_SHOW_PENALTY',
    -v_points_lost,
    'Points lost - no-show penalty applied by partner',
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'partner_id', v_reservation.partner_id,
      'offer_id', v_reservation.offer_id,
      'marked_by_partner', v_partner_user_id,
      'penalty_applied', true,
      'penalty_count', v_penalty_count,
      'points_permanently_lost', true
    )
  );

  -- Restore offer quantity (return items to available stock)
  UPDATE public.offers
  SET quantity_available = quantity_available + v_reservation.quantity,
      updated_at = NOW()
  WHERE id = v_reservation.offer_id;

  -- Mark reservation as FAILED_PICKUP
  UPDATE public.reservations
  SET status = 'FAILED_PICKUP',
      user_confirmed_pickup = FALSE
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true, 
    'points_lost', v_points_lost, 
    'penalty_applied', true,
    'penalty_count', v_penalty_count
  );
END;
$$;

COMMENT ON FUNCTION public.partner_mark_no_show IS 'Partner marks user as no-show, transfers held points as penalty, restores offer quantity';
