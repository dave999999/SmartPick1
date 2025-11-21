-- =====================================================
-- CRITICAL FIX: Users Table RLS Policies
-- Fixes 409 Conflict and 406 Not Acceptable errors during signup
-- =====================================================

BEGIN;

-- 1. Drop ALL existing policies on users table to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Admins can select all users" ON public.users;
DROP POLICY IF EXISTS "Allow supabase_admin trigger insert" ON public.users;
DROP POLICY IF EXISTS "Allow postgres trigger insert" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;

-- 2. Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Create NEW policies with correct permissions

-- Allow trigger to insert (SECURITY DEFINER function bypasses RLS, but just in case)
CREATE POLICY "Allow authenticated insert for signup"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to read all users
CREATE POLICY "Admins can read all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND UPPER(role) = 'ADMIN'
    )
  );

-- Allow admins to update all users
CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND UPPER(role) = 'ADMIN'
    )
  );

-- Allow admins to delete users
CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND UPPER(role) = 'ADMIN'
    )
  );

-- 4. Ensure the handle_new_user function is SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER -- This is critical - allows function to bypass RLS
SET search_path = public
AS $$
BEGIN
  -- Insert user profile (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'CUSTOMER'),
    'ACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail auth
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

COMMIT;

-- Test query (run this manually to verify):
-- SELECT * FROM public.users WHERE id = auth.uid();
