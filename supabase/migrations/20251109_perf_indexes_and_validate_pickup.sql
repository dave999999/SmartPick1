-- Performance indexes and validate_and_pickup RPC (non-breaking)
-- 1) Indexes
-- 2) Unique QR code constraint
-- 3) validate_and_pickup RPC to validate and pick up in one server roundtrip

BEGIN;

-- 1) Helpful indexes (IF NOT EXISTS pattern via plpgsql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_reservations_customer_id'
  ) THEN
    CREATE INDEX idx_reservations_customer_id ON public.reservations(customer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_reservations_partner_status'
  ) THEN
    CREATE INDEX idx_reservations_partner_status ON public.reservations(partner_id, status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_reservations_expires_at'
  ) THEN
    CREATE INDEX idx_reservations_expires_at ON public.reservations(expires_at);
  END IF;
END$$;

-- 2) Unique QR code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_reservations_qr_code'
  ) THEN
    -- Ensure no duplicates exist before adding unique index
    -- If duplicates exist, this will fail; handle manually if needed
    CREATE UNIQUE INDEX uniq_reservations_qr_code ON public.reservations(qr_code);
  END IF;
END$$;

-- 3) validate_and_pickup RPC: validates QR and marks as picked up atomically (uses caller partner)
DROP FUNCTION IF EXISTS public.validate_and_pickup(TEXT);
CREATE OR REPLACE FUNCTION public.validate_and_pickup(p_qr_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_partner_id UUID;
  v_res RECORD;
  v_grace_interval INTERVAL := interval '10 minutes';
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Not authenticated');
  END IF;

  SELECT id INTO v_partner_id FROM public.partners WHERE user_id = v_user;
  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Not a partner account');
  END IF;

  -- Find active or just-picked reservation by QR for this partner
  SELECT r.* INTO v_res
  FROM public.reservations r
  WHERE r.qr_code = p_qr_code
    AND r.partner_id = v_partner_id
    AND (
      (r.status = 'ACTIVE' AND (r.expires_at IS NULL OR r.expires_at > NOW() - v_grace_interval))
      OR r.status = 'PICKED_UP'
    )
  LIMIT 1;

  IF v_res IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired QR code');
  END IF;

  -- Delegate to partner_mark_as_picked_up for transfer/idempotency
  PERFORM partner_mark_as_picked_up(v_res.id);

  RETURN jsonb_build_object('valid', true, 'reservation_id', v_res.id);
END;
$$;

REVOKE ALL ON FUNCTION public.validate_and_pickup(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_and_pickup(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_pickup(TEXT) TO service_role;

COMMIT;

