-- =====================================================
-- FIX: Add RLS policy to allow admins to update partners
-- =====================================================

-- Add policy allowing admins to update any partner
CREATE POLICY "partners_admin_update"
  ON public.partners
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if user is admin
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  )
  WITH CHECK (
    -- Allow if user is admin
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- Also add SELECT policy for admins to see all partners
CREATE POLICY "partners_admin_select"
  ON public.partners
  FOR SELECT
  TO authenticated
  USING (
    -- Existing: approved partners OR own partner
    ((status)::text = 'APPROVED'::text) OR (user_id = auth.uid())
    OR
    -- New: admins see all partners
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- Drop old select policy first
DROP POLICY IF EXISTS "partners_select_approved" ON public.partners;

-- Test: Try to update a partner as admin
UPDATE partners 
SET status = 'PAUSED' 
WHERE id = (SELECT id FROM partners WHERE status = 'APPROVED' LIMIT 1)
RETURNING id, business_name, status;
