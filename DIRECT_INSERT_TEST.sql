-- ================================================
-- CHECK FOR FUNCTIONS/PROCEDURES ON OFFERS
-- ================================================

-- Check if there's a function that auto-inserts offers
SELECT 
  'FUNCTIONS CHECK' as check_type,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%offer%' OR routine_name LIKE '%create%')
ORDER BY routine_name;

-- Check if supabase has any special columns it adds
SELECT 
  'SUPABASE COLUMNS' as check_type,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_name = 'offers'
AND table_schema = 'public'
AND column_default IS NOT NULL;

-- Try a raw INSERT to see exact error
BEGIN;
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
  '0384c929-0af0-4124-a64a-85e63cba5f1a'::uuid,
  'DIRECT INSERT TEST',
  'Testing direct insert',
  'BAKERY',
  ARRAY[]::TEXT[],
  10.00,
  5.00,
  5,
  5,
  NOW(),
  NOW() + INTERVAL '2 hours',
  'ACTIVE',
  NOW() + INTERVAL '2 hours'
) RETURNING id, title, '✅ Direct INSERT worked!' as result;
ROLLBACK;
