-- ============================================
-- DEBUG 406 NOT ACCEPTABLE ERROR
-- Check if reservation exists and RLS policies allow access
-- ============================================

-- 1. Check if reservation 45f3a0b7-2e66-4b85-a0e8-cf382fe45362 exists
SELECT 
    id,
    customer_id,
    offer_id,
    partner_id,
    status,
    created_at,
    expires_at
FROM reservations
WHERE id = '45f3a0b7-2e66-4b85-a0e8-cf382fe45362';

-- 2. Check RLS policies on reservations table
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
  AND tablename = 'reservations'
ORDER BY policyname;

-- 3. Check if the join to users(name, email) is causing the issue
-- Test if user record exists and is accessible
SELECT 
    r.id,
    r.customer_id,
    u.name,
    u.email
FROM reservations r
LEFT JOIN users u ON u.id = r.customer_id
WHERE r.id = '45f3a0b7-2e66-4b85-a0e8-cf382fe45362';

-- 4. Check if offer join is accessible
SELECT 
    r.id,
    r.offer_id,
    o.title,
    o.status
FROM reservations r
LEFT JOIN offers o ON o.id = r.offer_id
WHERE r.id = '45f3a0b7-2e66-4b85-a0e8-cf382fe45362';

-- 5. Check if partner join is accessible
SELECT 
    r.id,
    r.partner_id,
    p.business_name,
    p.status
FROM reservations r
LEFT JOIN partners p ON p.id = r.partner_id
WHERE r.id = '45f3a0b7-2e66-4b85-a0e8-cf382fe45362';

-- 6. Test the EXACT query that failed (without joins first)
SELECT *
FROM reservations
WHERE id = '45f3a0b7-2e66-4b85-a0e8-cf382fe45362';

-- 7. Check if RLS is blocking the customer:users join
-- This is the most likely culprit for 406 errors
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
  AND cmd IN ('SELECT', 'ALL')
ORDER BY policyname;

-- ============================================
-- LIKELY CAUSE:
-- The customer:users(name, email) join requires SELECT permission on users table
-- If users table has restrictive RLS policies, PostgREST returns 406
-- ============================================

-- FIX: Add RLS policy to allow reading user names/emails when part of reservation
CREATE POLICY IF NOT EXISTS "Allow reading user info for reservations"
ON users FOR SELECT
USING (
  -- User can read their own info
  auth.uid() = id
  OR
  -- Partners can read customer info for their reservations
  EXISTS (
    SELECT 1 FROM reservations r
    INNER JOIN partners p ON p.id = r.partner_id
    WHERE r.customer_id = users.id
      AND p.user_id = auth.uid()
  )
  OR
  -- Customers can read partner info (business owner)
  EXISTS (
    SELECT 1 FROM partners p
    WHERE p.user_id = users.id
  )
);
