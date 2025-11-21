-- Make user_confirm_pickup idempotent and non-transferring if partner already transferred
-- Also add a uniqueness constraint to prevent duplicate partner transfer logs per reservation

BEGIN;

-- Prevent duplicate transfers per reservation for 'reservation_pickup'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_ppt_pickup_per_reservation'
  ) THEN
    CREATE UNIQUE INDEX uniq_ppt_pickup_per_reservation
      ON public.partner_point_transactions ((metadata->>'reservation_id'), reason, partner_id)
      WHERE reason = 'reservation_pickup';
  END IF;
END$$;

-- Redefine user_confirm_pickup to avoid double-transfer and just mark confirmation
CREATE OR REPLACE FUNCTION public.user_confirm_pickup(
  p_reservation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_res RECORD;
  v_tx RECORD;
  v_points INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Load reservation owned by caller
  SELECT * INTO v_res
  FROM public.reservations r
  WHERE r.id = p_reservation_id
    AND r.customer_id = v_user_id
  FOR UPDATE;

  IF v_res IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation not found');
  END IF;

  -- If already confirmed, return idempotent success (report original amount if known)
  IF v_res.user_confirmed_pickup IS TRUE THEN
    SELECT * INTO v_tx
    FROM public.partner_point_transactions t
    WHERE t.reason = 'reservation_pickup'
      AND t.metadata->>'reservation_id' = p_reservation_id::text
    LIMIT 1;

    v_points := COALESCE(v_tx.change, 0);
    RETURN jsonb_build_object('success', true, 'message', 'Already confirmed', 'points_transferred', v_points);
  END IF;

  -- If partner has already transferred points for this reservation, just mark confirmation
  SELECT * INTO v_tx
  FROM public.partner_point_transactions t
  WHERE t.reason = 'reservation_pickup'
    AND t.metadata->>'reservation_id' = p_reservation_id::text
  LIMIT 1;

  IF FOUND THEN
    v_points := COALESCE(v_tx.change, 0);
    UPDATE public.reservations
    SET user_confirmed_pickup = TRUE
    WHERE id = p_reservation_id;

    RETURN jsonb_build_object('success', true, 'points_transferred', v_points);
  END IF;

  -- If no partner transfer exists yet but reservation is PICKED_UP, do not transfer here
  -- to avoid conflicting flows; just mark confirmed and report escrow amount
  IF v_res.status = 'PICKED_UP' THEN
    UPDATE public.reservations
    SET user_confirmed_pickup = TRUE
    WHERE id = p_reservation_id;

    v_points := COALESCE(v_res.points_spent, 0);
    RETURN jsonb_build_object('success', true, 'points_transferred', v_points);
  END IF;

  RETURN jsonb_build_object('success', false, 'message', 'Reservation not ready for confirmation');
END;
$$;

REVOKE ALL ON FUNCTION public.user_confirm_pickup(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_confirm_pickup(UUID) TO authenticated;

COMMIT;

