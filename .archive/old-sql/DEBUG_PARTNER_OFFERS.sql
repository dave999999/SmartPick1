-- ============================================================================
-- DEBUG: Check specific partner status and ability to create offers
-- ============================================================================
-- Partner ID: 0f069ba3-2c87-44fe-99a0-97ba74532a86
-- ============================================================================

-- STEP 1: Check partner details
SELECT 
  id,
  user_id,
  business_name,
  status,
  created_at
FROM partners 
WHERE id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';

-- STEP 2: Check partner_points record
SELECT 
  user_id,
  balance,
  offer_slots,
  created_at
FROM partner_points 
WHERE user_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';

-- STEP 3: Check active offers for this partner
SELECT 
  id,
  title,
  status,
  quantity_available,
  quantity_total,
  created_at
FROM offers 
WHERE partner_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86'
ORDER BY created_at DESC;

-- STEP 4: Count active offers
SELECT 
  status,
  COUNT(*) as count
FROM offers 
WHERE partner_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86'
GROUP BY status;

-- STEP 5: Check if partner can create more offers
SELECT 
  p.business_name,
  pp.offer_slots as max_slots,
  COUNT(o.id) FILTER (WHERE o.status = 'ACTIVE') as active_offers,
  pp.offer_slots - COUNT(o.id) FILTER (WHERE o.status = 'ACTIVE') as remaining_slots,
  pp.balance as points_balance
FROM partners p
LEFT JOIN partner_points pp ON pp.user_id = p.id
LEFT JOIN offers o ON o.partner_id = p.id
WHERE p.id = '0f069ba3-2c87-44fe-99a0-97ba74532a86'
GROUP BY p.business_name, pp.offer_slots, pp.balance;

-- STEP 6: Check RLS status on offers table
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'offers';

-- STEP 7: Try to manually insert an offer to test permissions
-- (This will fail if RLS is blocking it)
DO $$
DECLARE
  v_partner_id UUID := '0f069ba3-2c87-44fe-99a0-97ba74532a86';
  v_test_offer_id UUID;
BEGIN
  -- Try to insert a test offer
  INSERT INTO offers (
    partner_id,
    title,
    description,
    category,
    original_price,
    smart_price,
    quantity_available,
    quantity_total,
    pickup_start,
    pickup_end,
    status
  )
  VALUES (
    v_partner_id,
    'TEST OFFER - DELETE ME',
    'This is a test offer to check permissions',
    'bakery',
    10.00,
    5.00,
    10,
    10,
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '3 hours',
    'ACTIVE'
  )
  RETURNING id INTO v_test_offer_id;
  
  RAISE NOTICE '✅ SUCCESS: Test offer created with ID: %', v_test_offer_id;
  
  -- Delete the test offer
  DELETE FROM offers WHERE id = v_test_offer_id;
  
  RAISE NOTICE '✅ Test offer deleted. Partner CAN create offers from database perspective.';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ FAILED: Cannot create offer. Error: %', SQLERRM;
    RAISE NOTICE 'This suggests RLS or permissions issue.';
END $$;

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================
-- If test offer creation failed:
-- 1. Run: ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;
-- 2. Rebuild frontend: pnpm build
-- 3. Hard refresh browser
--
-- If test offer creation succeeded but still fails in UI:
-- 1. Check browser console for exact error
-- 2. Check Network tab for API response
-- 3. Verify frontend code is using correct column names
-- 4. Make sure latest code is deployed
-- ============================================================================
