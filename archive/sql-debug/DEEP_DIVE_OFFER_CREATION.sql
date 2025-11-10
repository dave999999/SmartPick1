-- ================================================
-- DEEP DIVE DIAGNOSTIC: Why Can't Create Offers?
-- ================================================

-- 1. Check partner exists and status
SELECT 
  'PARTNER CHECK' as diagnostic_step,
  p.id,
  p.business_name,
  p.status,
  p.user_id,
  u.email as user_email,
  CASE 
    WHEN p.status = 'APPROVED' THEN '✅ Status is APPROVED'
    ELSE '❌ Status is ' || p.status || ' (MUST BE APPROVED)'
  END as status_check
FROM public.partners p
LEFT JOIN auth.users u ON u.id = p.user_id
ORDER BY p.created_at DESC;

-- 2. Check RLS policies on offers table
SELECT 
  'RLS POLICY CHECK' as diagnostic_step,
  policyname,
  cmd,
  qual as "using_check",
  with_check
FROM pg_policies
WHERE tablename = 'offers'
AND cmd = 'INSERT';

-- 3. Test if current user can see their partner record
SELECT 
  'AUTH USER CHECK' as diagnostic_step,
  auth.uid() as current_user_id,
  EXISTS(
    SELECT 1 FROM public.partners 
    WHERE user_id = auth.uid()
  ) as has_partner_record,
  (
    SELECT status FROM public.partners 
    WHERE user_id = auth.uid()
    LIMIT 1
  ) as partner_status;

-- 4. Check if there are ANY offers in the table (to verify table exists and works)
SELECT 
  'OFFERS TABLE CHECK' as diagnostic_step,
  COUNT(*) as total_offers,
  COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_offers,
  MAX(created_at) as last_offer_created
FROM public.offers;

-- 5. Try to simulate the INSERT that the frontend is doing
-- This will show if RLS is blocking it
DO $$
DECLARE
  v_partner_id UUID;
  v_test_result TEXT;
BEGIN
  -- Get the partner_id for current user
  SELECT id INTO v_partner_id 
  FROM public.partners 
  WHERE user_id = auth.uid() 
  LIMIT 1;

  IF v_partner_id IS NULL THEN
    RAISE NOTICE 'ERROR: No partner record found for current user!';
  ELSE
    RAISE NOTICE 'Partner ID found: %', v_partner_id;
    
    -- Try to insert a test offer (will rollback)
    BEGIN
      INSERT INTO public.offers (
        partner_id,
        title,
        description,
        category,
        images,
        original_price,
        smart_price,
        quantity_available,
        quantity_total,
        pickup_start,
        pickup_end,
        status,
        expires_at
      ) VALUES (
        v_partner_id,
        'TEST OFFER - WILL BE ROLLED BACK',
        'This is a test',
        'BAKERY',
        ARRAY[]::TEXT[],
        10.00,
        5.00,
        10,
        10,
        NOW(),
        NOW() + INTERVAL '2 hours',
        'ACTIVE',
        NOW() + INTERVAL '2 hours'
      );
      
      RAISE NOTICE '✅ SUCCESS: Test insert worked! RLS is allowing inserts.';
      RAISE EXCEPTION 'Rolling back test insert';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM = 'Rolling back test insert' THEN
          RAISE NOTICE '✅ Insert successful, rolled back as expected';
        ELSE
          RAISE NOTICE '❌ INSERT FAILED: %', SQLERRM;
        END IF;
    END;
  END IF;
END $$;

-- 6. Check if user is logged in at all
SELECT 
  'LOGIN CHECK' as diagnostic_step,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NOT LOGGED IN!'
    ELSE '✅ Logged in as: ' || auth.uid()::TEXT
  END as login_status;

-- 7. Final summary
SELECT 
  'SUMMARY' as diagnostic_step,
  (SELECT COUNT(*) FROM public.partners WHERE user_id = auth.uid()) as my_partner_count,
  (SELECT status FROM public.partners WHERE user_id = auth.uid() LIMIT 1) as my_partner_status,
  (SELECT COUNT(*) FROM public.offers WHERE partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid())) as my_offers_count,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ Not logged in'
    WHEN NOT EXISTS(SELECT 1 FROM public.partners WHERE user_id = auth.uid()) THEN '❌ No partner record'
    WHEN (SELECT status FROM public.partners WHERE user_id = auth.uid() LIMIT 1) != 'APPROVED' THEN '❌ Partner not approved'
    ELSE '✅ Everything looks good - check console logs'
  END as diagnosis;
