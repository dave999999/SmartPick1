-- ========================================
-- Fix Admin Dashboard Access (Case-Insensitive Roles)
-- Date: 2026-02-06
-- Scope: Admin dashboard only
-- ========================================

BEGIN;

-- user_points SELECT
DROP POLICY IF EXISTS user_points_select ON public.user_points;
CREATE POLICY user_points_select
ON public.user_points FOR SELECT
TO public
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND upper(u.role) IN ('ADMIN','SUPER_ADMIN','PARTNER')
  )
  OR auth.role() = 'service_role'
);

-- user_points UPDATE
DROP POLICY IF EXISTS user_points_update ON public.user_points;
CREATE POLICY user_points_update
ON public.user_points FOR UPDATE
TO public
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND upper(u.role) IN ('ADMIN','SUPER_ADMIN')
  )
  OR auth.role() = 'service_role'
);

-- user_points DELETE
DROP POLICY IF EXISTS user_points_delete ON public.user_points;
CREATE POLICY user_points_delete
ON public.user_points FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND upper(u.role) IN ('ADMIN','SUPER_ADMIN')
  )
  OR auth.role() = 'service_role'
);

-- point_transactions SELECT
DROP POLICY IF EXISTS point_transactions_admin_select ON public.point_transactions;
CREATE POLICY point_transactions_admin_select
ON public.point_transactions FOR SELECT
TO public
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND upper(u.role) IN ('ADMIN','SUPER_ADMIN')
  )
  OR auth.role() = 'service_role'
);

COMMIT;
