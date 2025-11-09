-- FIX: Correct the check_partner_offer_slots function to use proper column reference
-- The partner_points table uses user_id (which references auth.users)
-- But we need to get the user_id from partners table first

BEGIN;

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS trg_check_partner_offer_slots ON public.offers;
DROP FUNCTION IF EXISTS public.check_partner_offer_slots();

-- Recreate the function with correct column reference
CREATE OR REPLACE FUNCTION public.check_partner_offer_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_max_slots INT;
  v_current_count INT;
BEGIN
  -- Get partner's user_id from the partners table
  SELECT user_id INTO v_user_id
  FROM public.partners
  WHERE id = NEW.partner_id;

  -- If partner not found, skip validation
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get max allowed slots from partner_points (keyed by user_id)
  SELECT offer_slots INTO v_max_slots
  FROM public.partner_points
  WHERE user_id = v_user_id;  -- This is correct - partner_points uses user_id as PK

  -- Default to 4 if not found
  v_max_slots := COALESCE(v_max_slots, 4);

  -- Count current active/scheduled offers (excluding the one being inserted/updated)
  SELECT COUNT(*) INTO v_current_count
  FROM public.offers
  WHERE partner_id = NEW.partner_id
    AND status IN ('ACTIVE', 'SCHEDULED')
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid); -- Handle NULL id for inserts

  -- Check limit
  IF v_current_count >= v_max_slots THEN
    RAISE EXCEPTION 'Offer slot limit reached. You have % slots. Purchase more slots to add offers.', v_max_slots;
  END IF;

  RETURN NEW;
END;
$$;

-- Reattach trigger to offers table
CREATE TRIGGER trg_check_partner_offer_slots
  BEFORE INSERT OR UPDATE OF status ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_partner_offer_slots();

COMMENT ON FUNCTION public.check_partner_offer_slots() IS 'Validates offer slot limits before allowing new offers';

COMMIT;
