-- ================================================
-- MANUAL OFFER CREATION TEST
-- ================================================
-- This script will create a test offer for your partner account
-- to verify if the database/RLS is working

BEGIN;

-- Create a test offer for your partner
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
)
SELECT 
  id as partner_id,
  'TEST OFFER - Please Delete' as title,
  'This is a test offer created manually to verify database works' as description,
  business_type as category,
  ARRAY[]::TEXT[] as images,
  10.00 as original_price,
  5.00 as smart_price,
  5 as quantity_available,
  5 as quantity_total,
  NOW() as pickup_start,
  NOW() + INTERVAL '2 hours' as pickup_end,
  'ACTIVE' as status,
  NOW() + INTERVAL '2 hours' as expires_at
FROM public.partners
WHERE user_id = auth.uid()
LIMIT 1;

COMMIT;

-- Verify it was created
SELECT 
  'TEST OFFER CREATED' as result,
  id,
  title,
  status,
  created_at,
  '✅ If you see this, database is working! Problem is in frontend.' as diagnosis
FROM public.offers
WHERE title = 'TEST OFFER - Please Delete'
ORDER BY created_at DESC
LIMIT 1;

-- If no rows returned, it means RLS blocked the insert
SELECT 
  CASE 
    WHEN NOT EXISTS(SELECT 1 FROM public.offers WHERE title = 'TEST OFFER - Please Delete') 
    THEN '❌ OFFER NOT CREATED - RLS IS BLOCKING! Partner status must not be APPROVED.'
    ELSE '✅ OFFER CREATED SUCCESSFULLY'
  END as final_result;
