-- ====================================================================
-- TEST IDOR PROTECTION: Verify RLS is Working Correctly
-- ====================================================================
-- Run these queries to verify that IDOR protection is active

-- 1. Check if RLS is enabled on reservations table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'reservations';
-- Expected: rowsecurity = true

-- 2. List all RLS policies on reservations table
SELECT 
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE tablename = 'reservations'
ORDER BY policyname;

-- Expected policies:
-- 1. "Customers can read their own reservations"
-- 2. "Partners can view reservations for their offers"  
-- 3. "Admins can view all reservations"

-- 3. Count reservations accessible by current user
-- (Run while logged in as different users to test)
SELECT 
  COUNT(*) as accessible_reservations,
  auth.uid() as current_user
FROM reservations;

-- 4. Test customer access (should only see own reservations)
-- Replace 'USER_ID_HERE' with actual customer user ID
SELECT 
  id,
  customer_id,
  partner_id,
  status,
  CASE 
    WHEN customer_id = 'USER_ID_HERE' THEN 'Own reservation ✅'
    ELSE 'Should NOT see this ❌'
  END as access_check
FROM reservations
WHERE customer_id = 'USER_ID_HERE'
LIMIT 5;

-- 5. Test IDOR attempt (should return 0 rows)
-- Replace with UUID of a reservation the user does NOT own
SELECT *
FROM reservations
WHERE id = 'OTHER_USER_RESERVATION_ID';
-- Expected: 0 rows (blocked by RLS)

-- 6. Verify audit logging is capturing access attempts
SELECT 
  user_id,
  action,
  resource_type,
  resource_id,
  allowed,
  created_at
FROM audit_log
WHERE resource_type = 'reservation'
ORDER BY created_at DESC
LIMIT 10;
