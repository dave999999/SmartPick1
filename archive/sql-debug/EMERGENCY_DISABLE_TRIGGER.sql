-- EMERGENCY FIX: Disable the problematic trigger temporarily
-- This will allow you to create offers while we fix the schema issue

BEGIN;

-- Simply disable the trigger
DROP TRIGGER IF EXISTS trg_check_partner_offer_slots ON public.offers;

-- Optional: Also drop the function if you want
-- DROP FUNCTION IF EXISTS public.check_partner_offer_slots();

COMMIT;

-- After running this, try creating an offer again
-- It should work now (without slot limit checking)
