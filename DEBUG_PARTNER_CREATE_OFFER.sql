-- ============================================================================
-- DEBUG: Why can't partner 0f069ba3-2c87-44fe-99a0-97ba74532a86 create offers?
-- ============================================================================

-- 1. Check partner exists and is approved
SELECT 
  id,
  business_name,
  status,
  email,
  created_at
FROM partners
WHERE id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';

-- 2. Check partner_points record
SELECT 
  user_id,
  balance,
  offer_slots,
  created_at
FROM partner_points
WHERE user_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86';

-- 3. Count active offers
SELECT 
  COUNT(*) as active_offer_count,
  status
FROM offers
WHERE partner_id = '0f069ba3-2c87-44fe-99a0-97ba74532a86'
GROUP BY status;

-- 4. Check if RLS is enabled on offers table
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'offers';

-- 5. Show any RLS policies on offers
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'offers';

-- 6. Try to insert a test offer (this will show the exact error)
DO $$
DECLARE
  test_partner_id UUID := '0f069ba3-2c87-44fe-99a0-97ba74532a86';
  test_offer_id UUID;
BEGIN
  RAISE NOTICE '=== ATTEMPTING TEST OFFER CREATION ===';
  
  -- Try to insert
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
    'TEST OFFER - DELETE ME',
    'This is a test offer to debug creation issues',
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
  
  -- Clean up test offer
  DELETE FROM offers WHERE id = test_offer_id;
  RAISE NOTICE '✅ Test offer deleted';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ ERROR: %', SQLERRM;
  RAISE NOTICE 'Error detail: %', SQLSTATE;
END $$;

-- 7. Check if there are any triggers on offers table
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'offers'
  AND event_object_schema = 'public';
