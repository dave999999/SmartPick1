-- =====================================================
-- FINAL FIX: Re-enable RLS with proper admin bypass
-- =====================================================

-- 1. Re-enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
    END LOOP;
END $$;

-- 3. Create policy that allows BOTH own data AND service role access
-- Service role has full access (bypasses RLS)
-- Regular users see only their own data
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()  -- Users see their own row
    OR 
    auth.jwt()->>'role' = 'service_role'  -- Service role sees all
  );

-- 4. Grant SELECT to authenticated users
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.users TO service_role;

-- 5. Verify you can see your admin record
SELECT 
  id,
  email,
  role,
  'Success! You should be admin now' as status
FROM public.users
WHERE id = auth.uid();

-- 6. Test the admin function works
SELECT COUNT(*) as total_users,
  'Admin function working!' as status
FROM get_users_with_points_summary(NULL, 100, 0);
