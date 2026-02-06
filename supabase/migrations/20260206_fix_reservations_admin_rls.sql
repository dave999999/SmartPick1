-- ========================================
-- Fix reservations admin RLS (case-insensitive role)
-- Date: 2026-02-06
-- ========================================

BEGIN;

-- Drop old admin policy if present
DROP POLICY IF EXISTS "Admins can manage all reservations" ON public.reservations;

-- Recreate admin policy with case-insensitive role check
CREATE POLICY "Admins can manage all reservations"
  ON public.reservations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND upper(u.role) IN ('ADMIN', 'SUPER_ADMIN')
    )
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND upper(u.role) IN ('ADMIN', 'SUPER_ADMIN')
    )
    OR auth.role() = 'service_role'
  );

COMMIT;
