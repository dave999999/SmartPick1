-- ================================================
-- CHECK FOR TRIGGERS ON OFFERS TABLE
-- ================================================

-- Check if there are any triggers on offers table
SELECT 
  'TRIGGERS ON OFFERS' as check_type,
  trigger_name,
  event_manipulation as event,
  action_statement,
  action_timing as timing
FROM information_schema.triggers
WHERE event_object_table = 'offers'
ORDER BY trigger_name;

-- Check the actual columns in offers table
SELECT 
  'OFFERS TABLE COLUMNS' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'offers'
ORDER BY ordinal_position;

-- Try to insert with ONLY the exact columns that exist
DO $$
BEGIN
  -- This will show if the error is from our INSERT or from a trigger
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
    'TEST - Will be rolled back',
    'Test description',
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
  );
  
  RAISE NOTICE '✅ Insert successful!';
  RAISE EXCEPTION 'Rolling back test';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM = 'Rolling back test' THEN
      RAISE NOTICE 'Test rolled back successfully';
    ELSE
      RAISE NOTICE '❌ INSERT FAILED: %', SQLERRM;
    END IF;
END $$;
