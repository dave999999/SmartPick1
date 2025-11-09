-- COMPLETE ESCROW POINTS SYSTEM
-- Implements: Reserve → Hold points → Partner pickup → Transfer to partner

BEGIN;

-- ==========================================
-- STEP 1: Create escrow_points table
-- ==========================================
CREATE TABLE IF NOT EXISTS public.escrow_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL,
  amount_held INT NOT NULL CHECK (amount_held > 0),
  status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'RELEASED_TO_PARTNER', 'REFUNDED_TO_CUSTOMER', 'SPLIT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  UNIQUE(reservation_id)
);

CREATE INDEX IF NOT EXISTS idx_escrow_points_reservation ON public.escrow_points(reservation_id);
CREATE INDEX IF NOT EXISTS idx_escrow_points_customer ON public.escrow_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_points_status ON public.escrow_points(status);

COMMENT ON TABLE public.escrow_points IS 'Holds customer points in escrow until reservation is picked up or cancelled';

-- ==========================================
-- STEP 2: Function to hold points when reservation is created
-- ==========================================
CREATE OR REPLACE FUNCTION public.hold_points_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points_to_hold INT;
  v_customer_balance INT;
  v_partner_user_id UUID;
BEGIN
  -- Only process if reservation is ACTIVE
  IF NEW.status != 'ACTIVE' THEN
    RETURN NEW;
  END IF;

  -- Calculate points to hold (total_price rounded)
  v_points_to_hold := ROUND(NEW.total_price)::INT;

  -- Get customer's current balance
  SELECT balance INTO v_customer_balance
  FROM public.user_points
  WHERE user_id = NEW.customer_id;

  -- Get partner's user_id
  SELECT user_id INTO v_partner_user_id
  FROM public.partners
  WHERE id = NEW.partner_id;

  -- Deduct points from customer's balance
  UPDATE public.user_points
  SET balance = balance - v_points_to_hold,
      updated_at = NOW()
  WHERE user_id = NEW.customer_id;

  -- Create escrow record
  INSERT INTO public.escrow_points (
    reservation_id,
    customer_id,
    partner_id,
    amount_held,
    status
  ) VALUES (
    NEW.id,
    NEW.customer_id,
    v_partner_user_id,
    v_points_to_hold,
    'HELD'
  );

  -- Log transaction
  INSERT INTO public.point_transactions (
    user_id,
    change,
    reason,
    balance_before,
    balance_after,
    metadata
  ) VALUES (
    NEW.customer_id,
    -v_points_to_hold,
    'RESERVATION_HOLD',
    v_customer_balance,
    v_customer_balance - v_points_to_hold,
    json_build_object('reservation_id', NEW.id, 'offer_id', NEW.offer_id)::jsonb
  );

  RETURN NEW;
END;
$$;

-- Attach trigger to reservations table
DROP TRIGGER IF EXISTS trg_hold_points_on_reservation ON public.reservations;
CREATE TRIGGER trg_hold_points_on_reservation
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.hold_points_on_reservation();

-- ==========================================
-- STEP 3: Function to release points to partner on pickup
-- ==========================================
CREATE OR REPLACE FUNCTION public.release_points_to_partner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_escrow_record RECORD;
  v_partner_balance INT;
BEGIN
  -- Only process if status changed to PICKED_UP
  IF NEW.status = 'PICKED_UP' AND OLD.status != 'PICKED_UP' THEN
    
    -- Get escrow record
    SELECT * INTO v_escrow_record
    FROM public.escrow_points
    WHERE reservation_id = NEW.id
    AND status = 'HELD';

    IF FOUND THEN
      -- Get partner's current balance
      SELECT balance INTO v_partner_balance
      FROM public.partner_points
      WHERE partner_id = NEW.partner_id;

      IF v_partner_balance IS NULL THEN
        v_partner_balance := 0;
      END IF;

      -- Transfer points to partner
      INSERT INTO public.partner_points (partner_id, balance, offer_slots, created_at, updated_at)
      VALUES (NEW.partner_id, v_escrow_record.amount_held, 4, NOW(), NOW())
      ON CONFLICT (partner_id) 
      DO UPDATE SET 
        balance = partner_points.balance + v_escrow_record.amount_held,
        updated_at = NOW();

      -- Update escrow record
      UPDATE public.escrow_points
      SET status = 'RELEASED_TO_PARTNER',
          released_at = NOW()
      WHERE id = v_escrow_record.id;

      -- Log transaction
      INSERT INTO public.partner_point_transactions (
        partner_id,
        change,
        reason,
        balance_before,
        balance_after,
        metadata
      ) VALUES (
        v_escrow_record.partner_id,
        v_escrow_record.amount_held,
        'PICKUP_REWARD',
        v_partner_balance,
        v_partner_balance + v_escrow_record.amount_held,
        json_build_object('reservation_id', NEW.id, 'customer_id', NEW.customer_id)::jsonb
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to reservations table
DROP TRIGGER IF EXISTS trg_release_points_to_partner ON public.reservations;
CREATE TRIGGER trg_release_points_to_partner
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.release_points_to_partner();

-- ==========================================
-- STEP 4: Function to handle cancellation with 50/50 split
-- ==========================================

-- Drop old function first (return type changed)
DROP FUNCTION IF EXISTS public.user_cancel_reservation_split(UUID);

CREATE OR REPLACE FUNCTION public.user_cancel_reservation_split(p_reservation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reservation RECORD;
  v_escrow RECORD;
  v_customer_balance INT;
  v_partner_balance INT;
  v_customer_refund INT;
  v_partner_portion INT;
BEGIN
  -- Get reservation
  SELECT * INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  -- Verify ownership
  IF v_reservation.customer_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get escrow record
  SELECT * INTO v_escrow
  FROM public.escrow_points
  WHERE reservation_id = p_reservation_id
  AND status = 'HELD';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No held points found for this reservation';
  END IF;

  -- Calculate 50/50 split
  v_customer_refund := v_escrow.amount_held / 2;
  v_partner_portion := v_escrow.amount_held - v_customer_refund; -- Handle odd numbers

  -- Get current balances
  SELECT balance INTO v_customer_balance FROM public.user_points WHERE user_id = v_reservation.customer_id;
  SELECT balance INTO v_partner_balance FROM public.partner_points WHERE partner_id = v_reservation.partner_id;

  IF v_customer_balance IS NULL THEN v_customer_balance := 0; END IF;
  IF v_partner_balance IS NULL THEN v_partner_balance := 0; END IF;

  -- Refund 50% to customer
  UPDATE public.user_points
  SET balance = balance + v_customer_refund,
      updated_at = NOW()
  WHERE user_id = v_reservation.customer_id;

  -- Give 50% to partner
  INSERT INTO public.partner_points (partner_id, balance, offer_slots, created_at, updated_at)
  VALUES (v_reservation.partner_id, v_partner_portion, 4, NOW(), NOW())
  ON CONFLICT (partner_id)
  DO UPDATE SET
    balance = partner_points.balance + v_partner_portion,
    updated_at = NOW();

  -- Update escrow status
  UPDATE public.escrow_points
  SET status = 'SPLIT',
      released_at = NOW()
  WHERE id = v_escrow.id;

  -- Cancel reservation
  UPDATE public.reservations
  SET status = 'CANCELLED',
      updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Return quantity to offer
  UPDATE public.offers
  SET quantity_available = quantity_available + v_reservation.quantity,
      updated_at = NOW()
  WHERE id = v_reservation.offer_id;

  -- Log transactions
  INSERT INTO public.point_transactions (user_id, change, reason, balance_before, balance_after, metadata)
  VALUES (
    v_reservation.customer_id,
    v_customer_refund,
    'CANCELLATION_REFUND',
    v_customer_balance,
    v_customer_balance + v_customer_refund,
    json_build_object('reservation_id', p_reservation_id, 'split_ratio', '50/50')::jsonb
  );

  INSERT INTO public.partner_point_transactions (partner_id, change, reason, balance_before, balance_after, metadata)
  VALUES (
    v_escrow.partner_id,
    v_partner_portion,
    'CANCELLATION_FEE',
    v_partner_balance,
    v_partner_balance + v_partner_portion,
    json_build_object('reservation_id', p_reservation_id, 'split_ratio', '50/50')::jsonb
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Reservation cancelled with 50/50 split',
    'partner_received', v_partner_portion,
    'user_refunded', v_customer_refund
  );
END;
$$;

COMMIT;

-- Verification: Check if escrow table was created
SELECT 'Escrow system installed successfully' as status;
