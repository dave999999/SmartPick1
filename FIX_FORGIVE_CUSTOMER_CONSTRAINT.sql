-- Fix Partner Forgiveness Functions - Constraint Violation
-- Issue: When restoring quantity, it can exceed original_quantity causing:
--        "new row for relation 'offers' violates check constraint 'valid_quantity'"
-- Solution: Cap quantity_available at original_quantity in both functions

BEGIN;

-- ============================================
-- 1. Fix Partner Forgive Customer
-- ============================================

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
  v_offer RECORD;
  v_penalty_count INT;
  v_new_quantity INT;
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

  -- Allow forgiveness for:
  -- ACTIVE (may be expired but not processed yet)
  -- EXPIRED (legacy status before FAILED_PICKUP adoption)
  -- FAILED_PICKUP (system already penalized; we will decrement penalty)
  IF v_reservation.status NOT IN ('ACTIVE','EXPIRED','FAILED_PICKUP') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation already processed');
  END IF;

  -- Decrement penalty_count if currently a failed pickup
  IF v_reservation.status = 'FAILED_PICKUP' THEN
    UPDATE public.users
    SET penalty_count = CASE WHEN penalty_count > 0 THEN penalty_count - 1 ELSE 0 END
    WHERE id = v_reservation.customer_id
    RETURNING penalty_count INTO v_penalty_count;
  ELSE
    v_penalty_count := NULL; -- Not yet penalized (ACTIVE but expired) so nothing to decrement
  END IF;

  -- Restore quantity only if reservation was still ACTIVE or EXPIRED (not yet converted to FAILED_PICKUP)
  IF v_reservation.status IN ('ACTIVE','EXPIRED') THEN
    -- Get current offer state
    SELECT * INTO v_offer
    FROM public.offers
    WHERE id = v_reservation.offer_id
    FOR UPDATE;

    IF v_offer IS NOT NULL THEN
      -- Calculate new quantity, but cap it at original_quantity to avoid constraint violation
      v_new_quantity := LEAST(
        v_offer.quantity_available + v_reservation.quantity,
        v_offer.original_quantity
      );

      -- Update with capped quantity
      UPDATE public.offers
      SET quantity_available = v_new_quantity,
          updated_at = NOW()
      WHERE id = v_reservation.offer_id;
    END IF;
  END IF;

  -- Mark forgiven reservation as CANCELLED so it disappears
  UPDATE public.reservations
  SET status = 'CANCELLED', updated_at = NOW()
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Customer forgiven',
    'penalty_removed', v_penalty_count IS NOT NULL
  );
END;
$$;

COMMENT ON FUNCTION public.partner_forgive_customer IS 'Partner forgives customer with quantity cap to prevent constraint violations';

GRANT EXECUTE ON FUNCTION public.partner_forgive_customer(UUID) TO authenticated;

-- ============================================
-- 2. Fix Partner Confirm No-Show
-- ============================================

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
  v_offer RECORD;
  v_penalty_increment BOOLEAN := FALSE;
  v_new_quantity INT;
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

    -- Get current offer state
    SELECT * INTO v_offer
    FROM public.offers
    WHERE id = v_reservation.offer_id
    FOR UPDATE;

    IF v_offer IS NOT NULL THEN
      -- Calculate new quantity, but cap it at original_quantity to avoid constraint violation
      v_new_quantity := LEAST(
        v_offer.quantity_available + v_reservation.quantity,
        v_offer.original_quantity
      );

      -- Update with capped quantity
      UPDATE public.offers
      SET quantity_available = v_new_quantity,
          updated_at = NOW()
      WHERE id = v_reservation.offer_id;
    END IF;

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

COMMENT ON FUNCTION public.partner_confirm_no_show IS 'Partner confirms no-show with quantity cap to prevent constraint violations';

GRANT EXECUTE ON FUNCTION public.partner_confirm_no_show(UUID) TO authenticated;

COMMIT;

-- ============================================
-- Summary
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Partner forgiveness functions fixed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Functions Updated:';
  RAISE NOTICE '   1. partner_forgive_customer()';
  RAISE NOTICE '   2. partner_confirm_no_show()';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Fix Applied:';
  RAISE NOTICE '   - Quantity restoration now capped at original_quantity';
  RAISE NOTICE '   - Uses LEAST(current + restored, original) formula';
  RAISE NOTICE '   - No more "valid_quantity" constraint violations';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Both "Forgive" and "No-Show" buttons will work now!';
END $$;
