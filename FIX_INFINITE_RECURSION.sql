-- FIX INFINITE RECURSION - Drop and recreate users policies correctly
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "admins_read_all_users" ON public.users;

-- Users can read their own profile
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users (using JWT claim to avoid recursion)
CREATE POLICY "admins_read_all_users"
  ON public.users FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN'
  );
