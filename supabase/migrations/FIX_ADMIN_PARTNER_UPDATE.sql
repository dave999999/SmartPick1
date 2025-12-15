-- =====================================================
-- FIX: Allow admins to update partners (approve applications)
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "partners_admin_update" ON public.partners;

-- Create new policy that allows:
-- 1. Partners to update their own records
-- 2. Admins to update any partner (by checking users.role = 'ADMIN')
CREATE POLICY "partners_admin_update"
  ON public.partners
  FOR UPDATE
  TO authenticated
  USING (
    -- Partners can update their own
    user_id = auth.uid()
    OR
    -- Admins can update any partner
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND UPPER(users.role) = 'ADMIN'
    )
  )
  WITH CHECK (
    -- Partners can update their own
    user_id = auth.uid()
    OR
    -- Admins can update any partner
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND UPPER(users.role) = 'ADMIN'
    )
  );

-- Test: Check if policy was created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  cmd
FROM pg_policies 
WHERE tablename = 'partners' 
AND policyname = 'partners_admin_update';
