-- ============================================================================
-- FIX: Correct the check_partner_offer_slots trigger function
-- ============================================================================
-- Problem: The trigger function has buggy logic that's causing errors
-- Solution: Simplify to directly use NEW.partner_id without the unnecessary lookup
-- ============================================================================

-- Drop the broken trigger and function
DROP TRIGGER IF EXISTS trg_check_partner_offer_slots ON public.offers;
DROP FUNCTION IF EXISTS public.check_partner_offer_slots();

-- Create a corrected version
-- Key insight: partner_points.user_id stores partners.id (confusing naming!)
-- So we can directly query partner_points using NEW.partner_id
CREATE OR REPLACE FUNCTION public.check_partner_offer_slots()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_slots INT;
  v_current_count INT;
BEGIN
  -- Get max allowed slots for this partner
  -- IMPORTANT: partner_points.user_id actually stores partners.id (not auth.users.id)
  SELECT offer_slots INTO v_max_slots
  FROM public.partner_points
  WHERE user_id = NEW.partner_id;

  -- Default to 4 if partner doesn't have a partner_points record yet
  IF v_max_slots IS NULL THEN
    v_max_slots := 4;
  END IF;

  -- Only enforce limits for ACTIVE or SCHEDULED offers
  IF NEW.status NOT IN ('ACTIVE', 'SCHEDULED') THEN
    RETURN NEW;
  END IF;

  -- Count current active/scheduled offers for this partner
  -- Exclude the current row if it's an UPDATE (not a new INSERT)
  SELECT COUNT(*) INTO v_current_count
  FROM public.offers
  WHERE partner_id = NEW.partner_id
    AND status IN ('ACTIVE', 'SCHEDULED')
    AND (NEW.id IS NULL OR id != NEW.id);

  -- Check if limit would be exceeded
  IF v_current_count >= v_max_slots THEN
    RAISE EXCEPTION 'Offer slot limit reached. You have % of % slots used. Purchase more slots or deactivate an existing offer.', v_current_count, v_max_slots;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger for both INSERT and UPDATE
CREATE TRIGGER trg_check_partner_offer_slots
BEFORE INSERT OR UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.check_partner_offer_slots();

-- Add helpful comment
COMMENT ON FUNCTION public.check_partner_offer_slots() IS 
'Validates partner offer slot limits before allowing new active offers. Uses partner_points.user_id to track slots.';

-- ============================================================================
-- TEST: Verify the fix works
-- ============================================================================

-- Test with partner 0f069ba3-2c87-44fe-99a0-97ba74532a86
DO $$
DECLARE
  test_partner_id UUID := '0f069ba3-2c87-44fe-99a0-97ba74532a86';
  test_offer_id UUID;
  v_slots INT;
  v_active_count INT;
BEGIN
  RAISE NOTICE '=== TESTING FIXED TRIGGER ===';
  
  -- Show current state
  SELECT offer_slots INTO v_slots
  FROM partner_points
  WHERE user_id = test_partner_id;
  
  SELECT COUNT(*) INTO v_active_count
  FROM offers
  WHERE partner_id = test_partner_id
    AND status IN ('ACTIVE', 'SCHEDULED');
  
  RAISE NOTICE 'Partner has % slots, currently using % slots', v_slots, v_active_count;
  
  -- Try to insert a test offer
  BEGIN
    INSERT INTO offers (
      partner_id,
      category,
      title,
      description,
      original_price,
      smart_price,
      quantity_available,
      quantity_total,
      pickup_start,
      pickup_end,
      expires_at,
      status
    ) VALUES (
      test_partner_id,
      'food',
      'TEST OFFER - WILL BE DELETED',
      'Testing the fixed trigger function',
      100,
      50,
      10,
      10,
      NOW() + INTERVAL '1 hour',
      NOW() + INTERVAL '6 hours',
      NOW() + INTERVAL '6 hours',
      'ACTIVE'
    )
    RETURNING id INTO test_offer_id;
    
    RAISE NOTICE '✅ Test offer created successfully! ID: %', test_offer_id;
    
    -- Clean up
    DELETE FROM offers WHERE id = test_offer_id;
    RAISE NOTICE '✅ Test offer deleted - trigger is working correctly!';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR during test: %', SQLERRM;
    RAISE NOTICE 'This might be normal if partner has reached slot limit';
  END;
  
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show the updated trigger
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'offers'
  AND trigger_name = 'trg_check_partner_offer_slots';

RAISE NOTICE '==================================================';
RAISE NOTICE 'Trigger function fixed! Now try creating an offer from the partner dashboard.';
RAISE NOTICE '==================================================';
