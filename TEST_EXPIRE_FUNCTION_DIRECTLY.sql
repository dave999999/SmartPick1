-- Test the expire function directly
DO $$
DECLARE
  v_user_id UUID;
  v_result INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'davetest@gmail.com';
  
  RAISE NOTICE 'Testing expire_user_reservations for user: %', v_user_id;
  
  SELECT expire_user_reservations(v_user_id) INTO v_result;
  
  RAISE NOTICE 'Function returned: % reservations expired', v_result;
END $$;

-- Now check if ANY reservations exist at all
SELECT 
  'ALL RESERVATIONS (NO FILTER)' as check_type,
  COUNT(*) as total_count
FROM reservations;

-- Check specifically for this user with EITHER column
SELECT 
  'USER RESERVATIONS (EITHER COLUMN)' as check_type,
  r.id,
  r.status,
  r.customer_id,
  r.user_id,
  r.expires_at
FROM reservations r
WHERE r.customer_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
   OR r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC
LIMIT 10;
