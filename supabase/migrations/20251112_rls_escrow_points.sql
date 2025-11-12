-- RLS policies for escrow_points
-- Safe, minimal-access design:
-- - Customers can read their own escrow rows
-- - Partners can read escrow rows tied to their user id
-- - Admins can read and manage all rows
-- - Service role can read and manage all rows (for backend functions)

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.escrow_points ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist to avoid duplicates
DROP POLICY IF EXISTS service_role_all ON public.escrow_points;
DROP POLICY IF EXISTS admin_all ON public.escrow_points;
DROP POLICY IF EXISTS user_read_own ON public.escrow_points;
DROP POLICY IF EXISTS partner_read_own ON public.escrow_points;

-- 1) Service role full access (read/write)
-- Supabase: service key requests include role = 'service_role' in JWT
CREATE POLICY service_role_all ON public.escrow_points
AS PERMISSIVE
FOR ALL
TO public
USING ((auth.jwt() ->> 'role') = 'service_role')
WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 2) Admin full access (read/write)
-- Assumes public.users has a role column with 'ADMIN' or 'SUPERADMIN'
CREATE POLICY admin_all ON public.escrow_points
AS PERMISSIVE
FOR ALL
TO public
USING (EXISTS (
  SELECT 1 FROM public.users u
  WHERE u.id = auth.uid() AND u.role IN ('ADMIN','SUPERADMIN')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.users u
  WHERE u.id = auth.uid() AND u.role IN ('ADMIN','SUPERADMIN')
));

-- 3) Customers can read their own escrow rows
CREATE POLICY user_read_own ON public.escrow_points
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- 4) Partners can read escrow rows linked to their user id
-- Note: escrow_points.partner_id stores partners.user_id (the partner account id)
CREATE POLICY partner_read_own ON public.escrow_points
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (partner_id = auth.uid());

COMMIT;

-- Verification and summary
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'escrow_points';
  RAISE NOTICE 'escrow_points policy count: %', v_count;

  RAISE NOTICE 'Expected behavior:';
  RAISE NOTICE '- Authenticated users see rows where customer_id = auth.uid()';
  RAISE NOTICE '- Partners see rows where partner_id = auth.uid()';
  RAISE NOTICE '- Admins and service_role can read/write all rows';
END$$;