-- Fix: Admin partner approval - CORRECTED VERSION
-- Issue: Previous WITH CHECK clause was comparing new status to old status incorrectly

-- STEP 1: Check your admin role
SELECT id, email, role FROM users WHERE id = auth.uid();

-- STEP 2: Drop ALL conflicting UPDATE policies
DROP POLICY IF EXISTS "users_manage_own_partner_profile" ON public.partners;
DROP POLICY IF EXISTS "admins_manage_all_partners" ON public.partners;
DROP POLICY IF EXISTS "partners_update_policy" ON public.partners;

-- STEP 3: Create correct unified UPDATE policy
CREATE POLICY "partners_update_unified"
  ON public.partners FOR UPDATE
  TO authenticated
  USING (
    -- Admins can update any partner
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    OR
    -- Users can update their own partner profile
    user_id = auth.uid()
  )
  WITH CHECK (
    -- Admins can change anything
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    OR
    -- Regular users can ONLY update non-restricted fields
    -- They CANNOT change: status, approved_for_upload
    (
      user_id = auth.uid() 
      -- These columns must remain unchanged (NULL means column not in UPDATE statement)
      AND (
        (status IS NULL OR status = (SELECT p.status FROM partners p WHERE p.id = partners.id))
        OR status IS NOT DISTINCT FROM (SELECT p.status FROM partners p WHERE p.id = partners.id)
      )
    )
  );

-- STEP 4: Verify
SELECT 
  policyname,
  cmd,
  roles,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'partners' AND cmd IN ('UPDATE', 'ALL')
ORDER BY policyname;

-- STEP 5: Quick test as admin (uncomment to test)
-- UPDATE partners SET status = 'APPROVED' WHERE id = 'bcc49af1-5e95-469b-8552-b1ebd6e68f4e';
