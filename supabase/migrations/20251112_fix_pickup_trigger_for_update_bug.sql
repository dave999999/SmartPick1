-- SIMPLIFIED PICKUP TRIGGER: Skip escrow entirely, use only points_spent
-- This version is guaranteed to work with existing schema

BEGIN;

CREATE OR REPLACE FUNCTION public.transfer_points_to_partner_on_pickup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_user_id UUID;
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

  -- Get points from reservation.points_spent (no escrow queries)
  v_points_to_transfer := COALESCE(NEW.points_spent, GREATEST(0, COALESCE(NEW.quantity, 0) * 5));

  IF v_points_to_transfer <= 0 THEN
    RAISE NOTICE 'transfer_points_to_partner_on_pickup: no points to transfer for reservation_id=%', NEW.id;
    RETURN NEW;
  END IF;

  -- Idempotency: skip if we already logged a partner transaction for this reservation
  SELECT EXISTS (
    SELECT 1
    FROM public.partner_point_transactions ppt
    WHERE ppt.partner_id = v_partner_user_id
      AND ppt.metadata ->> 'reservation_id' = NEW.id::text
      AND ppt.reason IN ('PICKUP_REWARD', 'reservation_pickup')
  ) INTO v_tx_exists;

  IF v_tx_exists THEN
    RAISE NOTICE 'transfer_points_to_partner_on_pickup: points already transferred for reservation_id=%', NEW.id;
    RETURN NEW;
  END IF;

  -- Credit partner wallet and log a transaction
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

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.transfer_points_to_partner_on_pickup IS 'On reservation PICKED_UP, credit partner wallet using points_spent (simplified, no escrow)';

-- Ensure trigger is attached (re-create defensively)
DROP TRIGGER IF EXISTS trg_transfer_points_to_partner ON public.reservations;
CREATE TRIGGER trg_transfer_points_to_partner
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.transfer_points_to_partner_on_pickup();

COMMIT;
