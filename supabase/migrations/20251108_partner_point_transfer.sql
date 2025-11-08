-- Partner Point Transfer on Pickup
-- Transfer user's spent points to partner when reservation is picked up

BEGIN;

-- ============================================
-- Point Transfer Function
-- ============================================

CREATE OR REPLACE FUNCTION public.transfer_points_to_partner_on_pickup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_partner_user_id UUID;
  v_points_spent INT;
BEGIN
  -- Only proceed if status changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  -- Get partner's user_id from the offer
  SELECT p.user_id INTO v_partner_user_id
  FROM public.offers o
  JOIN public.partners p ON p.id = o.partner_id
  WHERE o.id = NEW.offer_id;

  IF v_partner_user_id IS NULL THEN
    -- Partner not found, log warning but don't fail
    RAISE WARNING 'Partner not found for offer_id: %', NEW.offer_id;
    RETURN NEW;
  END IF;

  -- Calculate points spent by user
  -- Assuming points_spent is stored on the reservation
  -- (5 points for basic, 15 for premium/priority)
  v_points_spent := COALESCE(NEW.points_spent, 0);

  -- If points_spent is 0, try to infer from offer pricing
  IF v_points_spent = 0 THEN
    -- Standard reservations typically cost 5 points
    -- Premium/Priority might cost 15 points
    -- Default to 5 if not tracked
    v_points_spent := 5;
  END IF;

  -- Transfer points to partner
  IF v_points_spent > 0 THEN
    PERFORM public.add_partner_points(
      v_partner_user_id,
      v_points_spent,
      'PICKUP_REWARD',
      jsonb_build_object(
        'reservation_id', NEW.id,
        'user_id', NEW.user_id,
        'offer_id', NEW.offer_id,
        'quantity', NEW.quantity,
        'picked_up_at', NEW.picked_up_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.transfer_points_to_partner_on_pickup IS 'Transfer user spent points to partner when reservation is picked up';

-- ============================================
-- Attach Trigger
-- ============================================

DROP TRIGGER IF EXISTS trg_transfer_points_to_partner ON public.reservations;
CREATE TRIGGER trg_transfer_points_to_partner
AFTER UPDATE OF status ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.transfer_points_to_partner_on_pickup();

-- ============================================
-- Add points_spent column to reservations if missing
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'reservations'
    AND column_name = 'points_spent'
  ) THEN
    ALTER TABLE public.reservations
    ADD COLUMN points_spent INT DEFAULT 5 CHECK (points_spent >= 0);
    
    COMMENT ON COLUMN public.reservations.points_spent IS 'SmartPoints spent by user to make this reservation';
    
    RAISE NOTICE 'Added points_spent column to reservations table';
  END IF;
END;
$$;

COMMIT;
