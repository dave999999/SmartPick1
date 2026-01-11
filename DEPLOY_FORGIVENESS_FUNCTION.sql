-- ============================================
-- Deploy Partner Forgive Customer Function
-- Run this in Supabase SQL Editor to ensure the function is deployed
-- ============================================

CREATE OR REPLACE FUNCTION public.partner_forgive_customer(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_user_id UUID := auth.uid();
  v_reservation RECORD;
  v_penalty_count INT;
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
    UPDATE public.offers
    SET quantity_available = quantity_available + v_reservation.quantity,
        updated_at = NOW()
    WHERE id = v_reservation.offer_id;
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

COMMENT ON FUNCTION public.partner_forgive_customer IS 'Partner forgives customer (optional decrement of penalty_count) supporting ACTIVE, EXPIRED, FAILED_PICKUP statuses.';

GRANT EXECUTE ON FUNCTION public.partner_forgive_customer(UUID) TO authenticated;

-- ============================================
-- TEST THE FUNCTION
-- ============================================

-- Check if function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'partner_forgive_customer';

-- Test query (replace with actual reservation_id to test)
-- SELECT partner_forgive_customer('YOUR_RESERVATION_ID_HERE'::UUID);
