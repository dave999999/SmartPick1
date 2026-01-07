-- =========================================================
-- DEEP INVESTIGATION: Why reservation still blocked?
-- =========================================================

-- Check 1: What reservations exist RIGHT NOW?
SELECT 
  '1️⃣ ALL RESERVATIONS' as check_step,
  r.id,
  r.status,
  r.user_id,
  r.expires_at,
  (r.expires_at < NOW()) as is_time_expired,
  (NOW() - r.expires_at) as time_since_expiry,
  r.created_at,
  r.updated_at
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC
LIMIT 20;

-- Check 2: Count by exact status
SELECT 
  '2️⃣ STATUS BREAKDOWN' as check_step,
  status,
  COUNT(*) as count
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
GROUP BY status
ORDER BY count DESC;

-- Check 3: Check database constraints
SELECT 
  '3️⃣ CONSTRAINTS' as check_step,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'reservations'::regclass
  AND conname LIKE '%active%';

-- Check 4: Check for triggers that might be preventing updates
SELECT 
  '4️⃣ TRIGGERS' as check_step,
  tgname as trigger_name,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'reservations'::regclass
  AND tgname LIKE '%expire%' OR tgname LIKE '%active%';

-- Check 5: Manually verify the exact query the frontend uses
SELECT 
  '5️⃣ FRONTEND QUERY (status=ACTIVE)' as check_step,
  COUNT(*) as active_count
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status = 'ACTIVE';

-- Check 6: Case insensitive check (in case mixed case)
SELECT 
  '6️⃣ CASE INSENSITIVE (ILIKE)' as check_step,
  COUNT(*) as active_count
FROM reservations
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
  AND status ILIKE 'active';

-- Check 7: Show EXACT bytes of status column
SELECT 
  '7️⃣ RAW STATUS BYTES' as check_step,
  r.id,
  r.status,
  encode(r.status::bytea, 'hex') as status_hex,
  length(r.status) as status_length,
  r.expires_at
FROM reservations r
WHERE r.user_id = (SELECT id FROM auth.users WHERE email = 'davetest@gmail.com')
ORDER BY r.created_at DESC
LIMIT 5;

-- Check 8: Try to see if there's a view or policy blocking
SELECT 
  '8️⃣ RLS POLICIES' as check_step,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'reservations';
