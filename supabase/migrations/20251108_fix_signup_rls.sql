-- Fix signup trigger vs RLS mismatch
-- Date: 2025-11-08
-- Context: The only INSERT policy on public.users is:
--   TO public WITH CHECK (auth.uid() = id)
-- Trigger-based inserts run without a JWT context, so auth.uid() is NULL and the policy blocks the insert.
-- Solution: allow the migration/trigger owner role (supabase_admin) to insert with a permissive policy.

BEGIN;

-- Create a permissive insert policy for the trigger owner's role (supabase_admin) if missing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Allow supabase_admin trigger insert'
    ) THEN
      EXECUTE 'CREATE POLICY "Allow supabase_admin trigger insert" ON public.users FOR INSERT TO supabase_admin WITH CHECK (true)';
    END IF;
  END IF;
END$$;

-- Create a permissive insert policy for postgres (sometimes owns auth/users) if missing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Allow postgres trigger insert'
    ) THEN
      EXECUTE 'CREATE POLICY "Allow postgres trigger insert" ON public.users FOR INSERT TO postgres WITH CHECK (true)';
    END IF;
  END IF;
END$$;

-- Keep existing self-insert policy intact
-- No changes to "Users can insert own profile"

-- Optional hardening: set a stable search_path for the function to avoid shadowing
ALTER FUNCTION public.handle_new_user() SET search_path = public;

COMMIT;