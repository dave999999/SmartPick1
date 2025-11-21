-- ============================================
-- ROLLBACK AND FIX: Simpler RLS policy without recursion
-- ============================================

BEGIN;

-- Drop the policy that's causing issues
DROP POLICY IF EXISTS "users_select_policy" ON public.users;

-- Create SIMPLER policy without complex EXISTS checks
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own data
    id = auth.uid()
    OR
    -- Service role has full access
    auth.jwt()->>'role' = 'service_role'
    OR
    -- Allow reading ANY user's basic info if they're a partner
    -- (needed for partner:partners(*) joins in offers)
    id IN (SELECT user_id FROM partners WHERE user_id IS NOT NULL)
  );

COMMIT;

-- ============================================
-- VERIFY IT WORKS
-- ============================================

-- Test 1: Can you see offers?
SELECT COUNT(*) as offer_count FROM offers WHERE status = 'ACTIVE';

-- Test 2: Can you see offers with partner join?
SELECT 
  o.id,
  o.title,
  p.business_name
FROM offers o
LEFT JOIN partners p ON p.id = o.partner_id
WHERE o.status = 'ACTIVE'
LIMIT 5;

-- Test 3: Can you create and fetch a reservation?
-- (Try reserving an offer in the UI after running this)
