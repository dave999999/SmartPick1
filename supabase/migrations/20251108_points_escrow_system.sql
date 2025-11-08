-- Points Escrow System
-- Points are held in escrow and only transferred after user confirms pickup

BEGIN;

-- ============================================
-- STEP 1: Add escrow tracking to reservations
-- ============================================

-- Add column to track if user confirmed pickup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'reservations'
    AND column_name = 'user_confirmed_pickup'
  ) THEN
    ALTER TABLE public.reservations
    ADD COLUMN user_confirmed_pickup BOOLEAN DEFAULT FALSE;
    
    COMMENT ON COLUMN public.reservations.user_confirmed_pickup IS 'True when user confirms they picked up the order';
  END IF;
END;
$$;

-- ============================================
-- STEP 2: Remove automatic point transfer trigger
-- ============================================

-- Drop the old trigger that auto-transferred points
DROP TRIGGER IF EXISTS trg_transfer_points_to_partner ON public.reservations;

-- ============================================
-- STEP 3: User confirms pickup (Happy Path)
-- ============================================

CREATE OR REPLACE FUNCTION public.user_confirm_pickup(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_reservation RECORD;
  v_partner_user_id UUID;
  v_points_to_transfer INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get reservation details
  SELECT r.*, o.partner_id INTO v_reservation
  FROM public.reservations r
  JOIN public.offers o ON o.id = r.offer_id
  WHERE r.id = p_reservation_id
    AND r.customer_id = v_user_id
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation not found');
  END IF;

  -- Must be in PICKED_UP status (partner already confirmed)
  IF v_reservation.status != 'PICKED_UP' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation not ready for confirmation');
  END IF;

  -- Check if already confirmed
  IF v_reservation.user_confirmed_pickup THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already confirmed');
  END IF;

  -- Get partner's user_id
  SELECT user_id INTO v_partner_user_id
  FROM public.partners
  WHERE id = v_reservation.partner_id;

  IF v_partner_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Partner not found');
  END IF;

  -- Get points that were held in escrow
  v_points_to_transfer := COALESCE(v_reservation.points_spent, 15);

  -- Transfer points to partner
  PERFORM public.add_partner_points(
    v_partner_user_id,
    v_points_to_transfer,
    'PICKUP_CONFIRMED',
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'user_id', v_user_id,
      'offer_id', v_reservation.offer_id
    )
  );

  -- Mark as user confirmed
  UPDATE public.reservations
  SET user_confirmed_pickup = TRUE
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object('success', true, 'points_transferred', v_points_to_transfer);
END;
$$;

COMMENT ON FUNCTION public.user_confirm_pickup IS 'User confirms pickup, transfers held points to partner';
GRANT EXECUTE ON FUNCTION public.user_confirm_pickup(UUID) TO authenticated;

-- ============================================
-- STEP 4: Partner marks no-show (Penalty)
-- ============================================

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

  -- Mark reservation as no-show (use CANCELLED status with metadata)
  UPDATE public.reservations
  SET status = 'CANCELLED',
      user_confirmed_pickup = FALSE
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object('success', true, 'points_transferred', v_points_to_transfer);
END;
$$;

COMMENT ON FUNCTION public.partner_mark_no_show IS 'Partner marks user as no-show, transfers held points as penalty';
GRANT EXECUTE ON FUNCTION public.partner_mark_no_show(UUID) TO authenticated;

-- ============================================
-- STEP 5: User cancels reservation (50/50 split)
-- ============================================

CREATE OR REPLACE FUNCTION public.user_cancel_reservation_split(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_reservation RECORD;
  v_partner_user_id UUID;
  v_points_held INT;
  v_points_to_partner INT;
  v_points_to_user INT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get reservation details
  SELECT r.* INTO v_reservation
  FROM public.reservations r
  WHERE r.id = p_reservation_id
    AND r.customer_id = v_user_id
  FOR UPDATE;

  IF v_reservation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation not found');
  END IF;

  -- Must be ACTIVE (not yet picked up)
  IF v_reservation.status != 'ACTIVE' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot cancel at this stage');
  END IF;

  -- Get partner's user_id
  SELECT user_id INTO v_partner_user_id
  FROM public.partners
  WHERE id = v_reservation.partner_id;

  -- Get held points
  v_points_held := COALESCE(v_reservation.points_spent, 15);
  
  -- Split 50/50
  v_points_to_partner := v_points_held / 2;
  v_points_to_user := v_points_held - v_points_to_partner; -- Handle odd numbers

  -- Transfer half to partner
  IF v_partner_user_id IS NOT NULL THEN
    PERFORM public.add_partner_points(
      v_partner_user_id,
      v_points_to_partner,
      'CANCELLATION_FEE',
      jsonb_build_object(
        'reservation_id', p_reservation_id,
        'user_id', v_user_id,
        'offer_id', v_reservation.offer_id
      )
    );
  END IF;

  -- Refund half to user
  UPDATE user_points
  SET balance = balance + v_points_to_user
  WHERE user_id = v_user_id;

  INSERT INTO point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  SELECT v_user_id, v_points_to_user, 'CANCELLATION_REFUND',
         balance - v_points_to_user, balance,
         jsonb_build_object('reservation_id', p_reservation_id, 'offer_id', v_reservation.offer_id)
  FROM user_points WHERE user_id = v_user_id;

  -- Restore offer quantity
  UPDATE offers
  SET quantity_available = quantity_available + v_reservation.quantity
  WHERE id = v_reservation.offer_id;

  -- Mark as cancelled
  UPDATE public.reservations
  SET status = 'CANCELLED'
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'partner_received', v_points_to_partner,
    'user_refunded', v_points_to_user
  );
END;
$$;

COMMENT ON FUNCTION public.user_cancel_reservation_split IS 'User cancels reservation, splits held points 50/50';
GRANT EXECUTE ON FUNCTION public.user_cancel_reservation_split(UUID) TO authenticated;

COMMIT;
