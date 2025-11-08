-- Fix infinite recursion in users policy by using a SECURITY DEFINER helper
-- Date: 2025-11-08

BEGIN;

-- 1) Drop the recursive policy if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='users' AND policyname='Admins can select all users'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can select all users" ON public.users';
  END IF;
END$$;

-- 2) Create a definer function that checks admin status without causing RLS recursion
--    Ensure it runs with privileges sufficient to read public.users
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = uid AND role = 'ADMIN'
  );
$$;

-- (Optional) ensure ownership by table owner to bypass RLS (may be no-op on Supabase)
-- ALTER FUNCTION public.is_admin(uuid) OWNER TO postgres;

-- 3) Recreate a non-recursive admin SELECT policy using the helper
CREATE POLICY "Admins can select all users" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

COMMIT;