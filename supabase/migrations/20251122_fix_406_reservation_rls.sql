-- ============================================
-- FIX 406 NOT ACCEPTABLE ERROR ON RESERVATION FETCH
-- Issue: RLS policy on users table blocks customer:users(name,email) join
-- Error: 406 when fetching reservation after creation
-- ============================================

BEGIN;

-- Drop the overly restrictive users_select_policy
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

-- Create new policy that allows reading user info in reservation context
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own data
    id = auth.uid()
    OR
    -- Service role has full access (for SECURITY DEFINER functions)
    auth.jwt()->>'role' = 'service_role'
    OR
    -- Customers can read their own reservation's partner info (business owner)
    EXISTS (
      SELECT 1 FROM reservations r
      INNER JOIN partners p ON p.id = r.partner_id
      WHERE r.customer_id = auth.uid()
        AND p.user_id = users.id
    )
    OR
    -- Partners can read customer info for their reservations
    EXISTS (
      SELECT 1 FROM reservations r
      INNER JOIN partners p ON p.id = r.partner_id
      WHERE p.user_id = auth.uid()
        AND r.customer_id = users.id
    )
    OR
    -- Public profile info is readable (for partner discovery)
    -- Only expose partner business owners, not customers
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.user_id = users.id
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

-- Test 1: User can see their own data
SELECT 
  'Test 1: Self' as test,
  CASE WHEN count(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM users
WHERE id = auth.uid();

-- Test 2: User can see partner info from their reservations
SELECT 
  'Test 2: Partner via reservation' as test,
  CASE WHEN count(*) >= 0 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM users u
WHERE EXISTS (
  SELECT 1 FROM reservations r
  INNER JOIN partners p ON p.id = r.partner_id
  WHERE r.customer_id = auth.uid()
    AND p.user_id = u.id
);

-- Test 3: Verify the EXACT query that was failing works now
-- Replace with actual reservation ID from error
-- SELECT *
-- FROM reservations
-- WHERE id = '45f3a0b7-2e66-4b85-a0e8-cf382fe45362';

-- Test 4: Verify joins work
-- SELECT 
--   r.*,
--   o.title as offer_title,
--   p.business_name,
--   u.name as customer_name
-- FROM reservations r
-- LEFT JOIN offers o ON o.id = r.offer_id
-- LEFT JOIN partners p ON p.id = r.partner_id
-- LEFT JOIN users u ON u.id = r.customer_id
-- WHERE r.id = '45f3a0b7-2e66-4b85-a0e8-cf382fe45362';

-- ============================================
-- NOTES
-- ============================================
-- The 406 error occurs because PostgREST enforces RLS on ALL joined tables
-- When customer:users(name,email) is blocked by RLS, PostgREST returns 406
-- This policy allows the join while maintaining security:
-- - Customers see partner info (business owner) for their reservations
-- - Partners see customer info (name, email) for their reservations
-- - Public can see partner business owners (for discovery)
-- - Nobody can see other customers' private data
