-- Fix: Admin partner approval by ensuring admin policy works correctly
-- Root cause: Multiple UPDATE policies must ALL pass (AND logic), not OR logic

-- STEP 1: Check your admin role
SELECT id, email, role FROM users WHERE id = auth.uid();

-- STEP 2: Check current policies on partners table
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'partners' AND cmd = 'UPDATE'
ORDER BY policyname;

-- STEP 3: Drop conflicting policies
DROP POLICY IF EXISTS "users_manage_own_partner_profile" ON public.partners;
DROP POLICY IF EXISTS "admins_manage_all_partners" ON public.partners;

-- STEP 4: Create a single unified UPDATE policy that handles both cases
CREATE POLICY "partners_update_policy"
  ON public.partners FOR UPDATE
  TO authenticated
  USING (
    -- Admins can see all partners
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    OR
    -- Users can see their own partner profile
    user_id = auth.uid()
  )
  WITH CHECK (
    -- Admins can update anything
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    OR
    -- Regular users can only update their own profile (not status or approval fields)
    (
      user_id = auth.uid() 
      AND status = (SELECT status FROM partners WHERE id = partners.id)
      AND approved_for_upload = (SELECT approved_for_upload FROM partners WHERE id = partners.id)
    )
  );

-- STEP 5: Verify the new policy
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'partners' AND cmd = 'UPDATE'
ORDER BY policyname;

-- STEP 6: Test (uncomment and replace with actual IDs)
-- UPDATE partners SET status = 'APPROVED' WHERE id = 'bcc49af1-5e95-469b-8552-b1ebd6e68f4e';
