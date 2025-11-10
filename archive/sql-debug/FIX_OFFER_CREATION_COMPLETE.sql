-- COMPLETE FIX FOR OFFER CREATION ERROR
-- This fixes the trigger and ensures partner_points records exist for all partners

BEGIN;

-- ==========================================
-- PART 1: Ensure partner_points records exist
-- ==========================================

-- Create partner_points records for any partners that don't have one
INSERT INTO public.partner_points (user_id, balance, offer_slots)
SELECT 
  p.user_id,
  1000, -- Welcome bonus
  4     -- Default 4 slots
FROM public.partners p
WHERE NOT EXISTS (
  SELECT 1 FROM public.partner_points pp WHERE pp.user_id = p.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- ==========================================
-- PART 2: Fix the trigger function
-- ==========================================

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS trg_check_partner_offer_slots ON public.offers;
DROP FUNCTION IF EXISTS public.check_partner_offer_slots();

-- Recreate the function with better error handling
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
  WHERE user_id = v_user_id;

  -- Default to 4 if not found (and create record)
  IF v_max_slots IS NULL THEN
    INSERT INTO public.partner_points (user_id, balance, offer_slots)
    VALUES (v_user_id, 1000, 4)
    ON CONFLICT (user_id) DO NOTHING;
    v_max_slots := 4;
  END IF;

  -- Count current active/scheduled offers (excluding the one being inserted/updated)
  SELECT COUNT(*) INTO v_current_count
  FROM public.offers
  WHERE partner_id = NEW.partner_id
    AND status IN ('ACTIVE', 'SCHEDULED')
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

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

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check that all partners have partner_points records
SELECT 
  'Partners without partner_points:' as check_name,
  COUNT(*) as count
FROM public.partners p
WHERE NOT EXISTS (
  SELECT 1 FROM public.partner_points pp WHERE pp.user_id = p.user_id
);

-- Check your specific partner
SELECT 
  'Your partner points record:' as check_name,
  pp.*
FROM public.partners p
JOIN public.partner_points pp ON pp.user_id = p.user_id
WHERE p.id = '0384c929-0af0-4124-a64a-85e63cba5f1a';
