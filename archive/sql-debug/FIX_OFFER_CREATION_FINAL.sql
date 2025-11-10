-- CORRECT FIX FOR OFFER CREATION ERROR
-- The partner_points table uses partner_id, not user_id

BEGIN;

-- ==========================================
-- PART 1: Ensure partner_points records exist for all partners
-- ==========================================

-- Create partner_points records for any partners that don't have one
INSERT INTO public.partner_points (partner_id, balance, offer_slots, created_at, updated_at)
SELECT 
  p.id,         -- Use partner.id, not user_id!
  1000,         -- Welcome bonus
  4,            -- Default 4 slots
  NOW(),
  NOW()
FROM public.partners p
WHERE NOT EXISTS (
  SELECT 1 FROM public.partner_points pp WHERE pp.partner_id = p.id
)
ON CONFLICT (partner_id) DO NOTHING;

-- ==========================================
-- PART 2: Fix the trigger function to use partner_id
-- ==========================================

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS trg_check_partner_offer_slots ON public.offers;
DROP FUNCTION IF EXISTS public.check_partner_offer_slots();

-- Recreate the function with CORRECT column reference
CREATE OR REPLACE FUNCTION public.check_partner_offer_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_slots INT;
  v_current_count INT;
BEGIN
  -- Get max allowed slots from partner_points (keyed by partner_id, NOT user_id!)
  SELECT offer_slots INTO v_max_slots
  FROM public.partner_points
  WHERE partner_id = NEW.partner_id;  -- Use partner_id directly!

  -- Default to 4 if not found (and create record)
  IF v_max_slots IS NULL THEN
    -- Create partner_points record if missing
    INSERT INTO public.partner_points (partner_id, balance, offer_slots, created_at, updated_at)
    VALUES (NEW.partner_id, 1000, 4, NOW(), NOW())
    ON CONFLICT (partner_id) DO NOTHING;
    v_max_slots := 4;
  END IF;

  -- Count current active/scheduled offers (excluding the one being inserted/updated)
  SELECT COUNT(*) INTO v_current_count
  FROM public.offers
  WHERE partner_id = NEW.partner_id
    AND status IN ('ACTIVE', 'SCHEDULED')
    AND id IS DISTINCT FROM NEW.id; -- Handle both inserts and updates

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
  SELECT 1 FROM public.partner_points pp WHERE pp.partner_id = p.id
);

-- Check your specific partner's record
SELECT 
  'Your partner points record:' as check_name,
  pp.*
FROM public.partner_points pp
WHERE pp.partner_id = '0384c929-0af0-4124-a64a-85e63cba5f1a';

-- If nothing shows up, it means the record was just created
SELECT 
  'All partner_points records:' as check_name,
  COUNT(*) as total_records
FROM public.partner_points;
