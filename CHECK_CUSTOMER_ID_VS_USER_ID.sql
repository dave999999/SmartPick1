-- Check with CUSTOMER_ID (not user_id)
SELECT 
  'CHECK WITH CUSTOMER_ID' as check_type,
  r.id,
  r.status,
  r.customer_id,
  r.user_id,
  r.expires_at
FROM reservations r
WHERE r.customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC
LIMIT 10;

-- Count ACTIVE with customer_id
SELECT 
  'ACTIVE COUNT (customer_id)' as check_type,
  COUNT(*) as count
FROM reservations
WHERE customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';

-- Check table schema - what columns exist?
SELECT 
  'TABLE COLUMNS' as check_type,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'reservations'
  AND column_name IN ('user_id', 'customer_id')
ORDER BY ordinal_position;
