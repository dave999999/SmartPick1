-- Fix: Allow admins to approve partners by updating RLS policies
-- Issue: users_manage_own_partner_profile policy blocks status changes

-- STEP 1: Check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'partners' 
ORDER BY policyname;

-- STEP 2: Drop the restrictive policy
DROP POLICY IF EXISTS "users_manage_own_partner_profile" ON public.partners;

-- STEP 3: Recreate with proper admin bypass
CREATE POLICY "users_manage_own_partner_profile"
  ON public.partners FOR UPDATE
  USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    -- Admins can update anything
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
    OR
    -- Regular users can only update their own profile (not status)
    (
      user_id = auth.uid() AND
      (status IS NULL OR status = (SELECT status FROM partners WHERE user_id = auth.uid()))
    )
  );

-- STEP 4: Verify the fix
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'partners' 
ORDER BY policyname;

-- STEP 5: Test the update (replace with actual partner ID)
-- UPDATE partners SET status = 'APPROVED' WHERE id = 'bcc49af1-5e95-469b-8552-b1ebd6e68f4e';
