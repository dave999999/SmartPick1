-- COMPREHENSIVE FIX: Check everything and fix admin approval issue

-- STEP 1: Verify you are logged in as admin
SELECT 
  id, 
  email, 
  role,
  CASE 
    WHEN role = 'ADMIN' THEN '✅ You are an ADMIN'
    ELSE '❌ You are NOT an admin'
  END as status
FROM users 
WHERE id = auth.uid();

-- STEP 2: Check ALL policies on partners table (not just UPDATE)
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  substring(qual::text, 1, 100) as using_clause_preview,
  substring(with_check::text, 1, 100) as with_check_preview
FROM pg_policies 
WHERE tablename = 'partners'
ORDER BY cmd, policyname;

-- STEP 3: Drop ALL existing UPDATE and ALL policies on partners
DROP POLICY IF EXISTS "users_manage_own_partner_profile" ON public.partners;
DROP POLICY IF EXISTS "admins_manage_all_partners" ON public.partners;
DROP POLICY IF EXISTS "partners_update_policy" ON public.partners;
DROP POLICY IF EXISTS "partners_update_unified" ON public.partners;
DROP POLICY IF EXISTS "admins_full_access" ON public.partners;
DROP POLICY IF EXISTS "users_manage_own_partner" ON public.partners;

-- STEP 4: Recreate ONLY the admin ALL policy (simplest approach)
CREATE POLICY "admins_full_access"
  ON public.partners FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- STEP 5: Create partner self-management policy (non-admins)
CREATE POLICY "users_manage_own_partner"
  ON public.partners FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND status IS NOT DISTINCT FROM (SELECT status FROM partners WHERE id = partners.id)
  );

-- STEP 6: Verify final policies
SELECT 
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'partners'
ORDER BY cmd, policyname;

-- STEP 7: Test update (uncomment and try)
-- UPDATE partners SET status = 'APPROVED' WHERE id = 'bcc49af1-5e95-469b-8552-b1ebd6e68f4e';
