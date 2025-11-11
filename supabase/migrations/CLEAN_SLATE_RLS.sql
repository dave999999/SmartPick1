-- =====================================================
-- CLEAN SLATE: Remove ALL policies and start fresh
-- =====================================================

-- 1. Drop ALL existing policies on these tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
    END LOOP;
    
    -- Drop all policies on user_points table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_points' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.user_points';
    END LOOP;
    
    -- Drop all policies on point_transactions table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'point_transactions' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.point_transactions';
    END LOOP;
END $$;

-- 2. Create SIMPLE policies (no infinite loops)
-- Users can only see their own row
CREATE POLICY "user_select_own"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can only see their own points
CREATE POLICY "user_select_own_points"
  ON public.user_points FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can only see their own transactions
CREATE POLICY "user_select_own_transactions"
  ON public.point_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Verify you're still admin
SELECT 
  id,
  email,
  role,
  'You are admin - RLS policies reset!' as status
FROM public.users
WHERE id = auth.uid();

-- 4. Test that the function works (it should bypass RLS with SECURITY DEFINER)
SELECT COUNT(*) as total_users
FROM get_users_with_points_summary(NULL, 100, 0);
