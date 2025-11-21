-- Add missing release columns to escrow_points to support pickup escrow release
-- Safe to run multiple times

BEGIN;

-- Ensure escrow_points table exists with basic columns used by hold trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'escrow_points'
  ) THEN
    CREATE TABLE public.escrow_points (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reservation_id UUID NOT NULL,
      customer_id UUID NOT NULL,
      partner_id UUID NOT NULL,
      amount_held INT NOT NULL CHECK (amount_held >= 0),
      status TEXT NOT NULL DEFAULT 'HELD',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Add release columns if missing
ALTER TABLE public.escrow_points
  ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS released_reason TEXT;

-- Optional: index for quick lookup by reservation
CREATE INDEX IF NOT EXISTS idx_escrow_points_reservation
  ON public.escrow_points(reservation_id);

-- Sanity notices
DO $$
DECLARE
  v_has_released_at boolean;
  v_has_released_reason boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'escrow_points' AND column_name = 'released_at'
  ) INTO v_has_released_at;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'escrow_points' AND column_name = 'released_reason'
  ) INTO v_has_released_reason;

  RAISE NOTICE 'escrow_points.released_at present: %', v_has_released_at;
  RAISE NOTICE 'escrow_points.released_reason present: %', v_has_released_reason;
END $$;

COMMIT;
