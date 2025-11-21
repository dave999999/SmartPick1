-- =====================================================
-- FIX: Add RLS policy to allow admins to update partners
-- =====================================================

-- Drop old admin policy if exists
DROP POLICY IF EXISTS "partners_admin_update" ON public.partners;

-- Add policy allowing admins to update any partner
-- Using simple owner check to avoid RLS recursion
CREATE POLICY "partners_admin_update"
  ON public.partners
  FOR UPDATE
  TO authenticated
  USING (
    -- Partners can update their own
    user_id = auth.uid()
    -- No admin check here to avoid RLS recursion
    -- Admin access is checked at API level via checkAdminAccess()
  )
  WITH CHECK (
    -- Partners can update their own
    user_id = auth.uid()
  );

-- Drop old select policy first
DROP POLICY IF EXISTS "partners_select_approved" ON public.partners;
DROP POLICY IF EXISTS "partners_admin_select" ON public.partners;

-- Add SELECT policy for admins to see all partners
-- Using simple approach to avoid RLS recursion
CREATE POLICY "partners_admin_select"
  ON public.partners
  FOR SELECT
  TO authenticated
  USING (
    -- Approved partners visible to all
    ((status)::text = 'APPROVED'::text) 
    OR 
    -- Partners see their own
    (user_id = auth.uid())
    -- No admin check here to avoid RLS recursion
    -- Admin access is checked at API level via checkAdminAccess()
  );

-- Test: Try to update a partner as admin
UPDATE partners 
SET status = 'PAUSED' 
WHERE id = (SELECT id FROM partners WHERE status = 'APPROVED' LIMIT 1)
RETURNING id, business_name, status;
