-- ============================================================================
-- EMERGENCY FIX: Manually create partner_points record for existing partner
-- ============================================================================
-- This creates the missing partner_points record so the partner can create offers
-- ============================================================================

-- STEP 1: Find the partner that needs points
SELECT 
  id,
  business_name,
  status,
  user_id
FROM partners 
WHERE business_name LIKE '%მარა%' OR business_name LIKE '%sivero%'
ORDER BY created_at DESC;

-- STEP 2: Manually insert partner_points record
-- Replace the partner_id below with the actual partner ID from Step 1

DO $$
DECLARE
  v_partner_id UUID;
  v_business_name TEXT;
BEGIN
  -- Find the partner (adjust the WHERE clause if needed)
  SELECT id, business_name 
  INTO v_partner_id, v_business_name
  FROM partners 
  WHERE business_name LIKE '%მარა%' OR business_name LIKE '%sivero%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_partner_id IS NOT NULL THEN
    RAISE NOTICE 'Found partner: % (ID: %)', v_business_name, v_partner_id;
    
    -- Check if they already have points
    IF EXISTS (SELECT 1 FROM partner_points WHERE user_id = v_partner_id) THEN
      RAISE NOTICE '✅ Partner already has points record';
      
      -- Show their current points
      DECLARE
        v_balance INTEGER;
        v_slots INTEGER;
      BEGIN
        SELECT balance, offer_slots 
        INTO v_balance, v_slots
        FROM partner_points 
        WHERE user_id = v_partner_id;
        
        RAISE NOTICE 'Current balance: %', v_balance;
        RAISE NOTICE 'Current offer slots: %', v_slots;
      END;
    ELSE
      RAISE NOTICE 'Creating partner_points record...';
      
      -- Insert partner_points record
      INSERT INTO partner_points (user_id, balance, offer_slots, created_at, updated_at)
      VALUES (v_partner_id, 1000, 4, NOW(), NOW());
      
      RAISE NOTICE '✅ SUCCESS: Created partner_points record';
      RAISE NOTICE '   - Balance: 1000';
      RAISE NOTICE '   - Offer slots: 4';
      
      -- Also create a transaction record
      INSERT INTO partner_point_transactions (
        partner_id, 
        change, 
        reason, 
        balance_before, 
        balance_after, 
        metadata,
        created_at
      )
      VALUES (
        v_partner_id,
        1000,
        'MANUAL_FIX',
        0,
        1000,
        jsonb_build_object(
          'note', 'Manually created partner_points record',
          'business_name', v_business_name
        ),
        NOW()
      );
      
      RAISE NOTICE '✅ Transaction record created';
    END IF;
  ELSE
    RAISE NOTICE '❌ Partner not found! Adjust the WHERE clause in the query.';
  END IF;
END $$;

-- STEP 3: Verify the partner can now create offers
SELECT 
  p.id,
  p.business_name,
  p.status,
  pp.balance,
  pp.offer_slots,
  (SELECT COUNT(*) FROM offers WHERE partner_id = p.id AND status = 'ACTIVE') as active_offers
FROM partners p
LEFT JOIN partner_points pp ON pp.user_id = p.id
WHERE p.business_name LIKE '%მარა%' OR p.business_name LIKE '%sivero%'
ORDER BY p.created_at DESC;

-- Expected output:
-- - Partner should have balance = 1000
-- - Partner should have offer_slots = 4
-- - active_offers should be shown

-- ============================================================================
-- STEP 4: Now run the trigger fix to prevent future issues
-- ============================================================================
-- After running this script, also run FIX_PARTNER_POINTS_TRIGGER.sql
-- to ensure new partners get points automatically when approved
-- ============================================================================

RAISE NOTICE '
✅ Partner points record created!

Next steps:
1. Hard refresh browser (Ctrl + Shift + R)
2. Try creating offer again
3. Should work now!

Also run FIX_PARTNER_POINTS_TRIGGER.sql to fix the trigger for future partners.
';
