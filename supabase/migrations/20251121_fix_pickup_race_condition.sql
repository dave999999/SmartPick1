-- Fix race condition in escrow release on pickup
-- Add database-level constraint to prevent duplicate point credits

BEGIN;

-- Step 1: Add unique constraint to prevent duplicate pickup rewards
-- This will cause the second concurrent attempt to fail with a constraint violation
ALTER TABLE public.partner_point_transactions 
ADD CONSTRAINT IF NOT EXISTS unique_reservation_pickup 
UNIQUE (partner_id, ((metadata->>'reservation_id')::UUID));

-- Step 2: Create index to support the constraint and improve query performance
CREATE INDEX IF NOT EXISTS idx_partner_point_transactions_reservation_id 
ON public.partner_point_transactions ((metadata->>'reservation_id')::UUID)
WHERE metadata->>'reservation_id' IS NOT NULL;

-- Step 3: Update the trigger function to handle constraint violations gracefully
CREATE OR REPLACE FUNCTION public.transfer_points_to_partner_on_pickup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_user_id UUID;
  v_points_spent INT;
  v_points_held INT;
  v_points_to_transfer INT;
  v_tx_exists BOOLEAN := FALSE;
BEGIN
  -- Only proceed if status just changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  -- Resolve the partner's user_id from the offer/partner
  SELECT p.user_id INTO v_partner_user_id
  FROM public.offers o
  JOIN public.partners p ON p.id = o.partner_id
  WHERE o.id = NEW.offer_id;

  IF v_partner_user_id IS NULL THEN
    RAISE WARNING 'transfer_points_to_partner_on_pickup: partner user not found for offer_id=%', NEW.offer_id;
    RETURN NEW;
  END IF;

  -- First, try to get held points from escrow for this reservation
  SELECT COALESCE(SUM(e.amount_held), 0) INTO v_points_held
  FROM public.escrow_points e
  WHERE e.reservation_id = NEW.id AND e.status = 'HELD'
  FOR UPDATE;

  -- Fallback to points_spent stored on the reservation if escrow row not found
  v_points_spent := COALESCE(NEW.points_spent, 0);

  v_points_to_transfer := CASE
    WHEN v_points_held > 0 THEN v_points_held
    WHEN v_points_spent > 0 THEN v_points_spent
    ELSE GREATEST(0, COALESCE(NEW.quantity, 0) * 5)
  END;

  IF v_points_to_transfer <= 0 THEN
    RAISE NOTICE 'transfer_points_to_partner_on_pickup: no points to transfer for reservation_id=%', NEW.id;
    RETURN NEW;
  END IF;

  -- Idempotency check with row-level lock
  -- Lock the specific transaction row if it exists to prevent race conditions
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_point_transactions ppt
    WHERE ppt.partner_id = v_partner_user_id
      AND (ppt.metadata->>'reservation_id')::UUID = NEW.id
      AND (ppt.reason = 'PICKUP_REWARD' OR ppt.reason = 'reservation_pickup')
    FOR UPDATE SKIP LOCKED  -- Skip if another transaction is already processing this
  ) INTO v_tx_exists;

  IF v_tx_exists THEN
    RAISE NOTICE 'transfer_points_to_partner_on_pickup: points already transferred for reservation_id=%', NEW.id;
    -- Still mark escrow as released if it's somehow left HELD
    IF v_points_held > 0 THEN
      UPDATE public.escrow_points
      SET status = 'RELEASED',
          released_at = NOW(),
          released_reason = 'PICKED_UP'
      WHERE reservation_id = NEW.id AND status = 'HELD';
    END IF;
    RETURN NEW;
  END IF;

  -- Update escrow rows to RELEASED now that pickup occurred
  IF v_points_held > 0 THEN
    UPDATE public.escrow_points
    SET status = 'RELEASED',
        released_at = NOW(),
        released_reason = 'PICKED_UP'
    WHERE reservation_id = NEW.id AND status = 'HELD';
  END IF;

  -- Credit partner wallet and log a transaction
  -- The unique constraint will prevent duplicate transactions even if concurrent
  BEGIN
    PERFORM public.add_partner_points(
      v_partner_user_id,
      v_points_to_transfer,
      'PICKUP_REWARD',
      jsonb_build_object(
        'reservation_id', NEW.id,
        'customer_id', NEW.customer_id,
        'offer_id', NEW.offer_id,
        'quantity', NEW.quantity,
        'picked_up_at', NEW.picked_up_at
      )
    );
  EXCEPTION
    WHEN unique_violation THEN
      -- Another concurrent transaction already credited the points
      RAISE NOTICE 'transfer_points_to_partner_on_pickup: concurrent transaction detected for reservation_id=%, skipping', NEW.id;
      RETURN NEW;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.transfer_points_to_partner_on_pickup IS 
  'On reservation status → PICKED_UP, release escrow to partner and credit partner wallet. '
  'Race condition protected via unique constraint and FOR UPDATE SKIP LOCKED.';

-- Reattach the trigger to ensure latest function is used
DROP TRIGGER IF EXISTS trg_transfer_points_to_partner ON public.reservations;
CREATE TRIGGER trg_transfer_points_to_partner
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.transfer_points_to_partner_on_pickup();

COMMIT;
