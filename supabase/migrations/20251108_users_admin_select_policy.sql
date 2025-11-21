-- Allow admins to select all users for admin dashboard
-- Date: 2025-11-08

BEGIN;

-- Create or replace an admin-select policy
DO $$
BEGIN
  -- Drop existing policy if present to keep a single definitive one
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='users' AND policyname='Admins can select all users'
  ) THEN
    EXECUTE 'DROP POLICY "Admins can select all users" ON public.users';
  END IF;

  -- Allow any authenticated user who is an ADMIN in public.users to select all rows
  EXECUTE 'CREATE POLICY "Admins can select all users" ON public.users
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.users AS me 
      WHERE me.id = auth.uid() AND me.role = ''ADMIN''
    ))';
END$$;

COMMIT;