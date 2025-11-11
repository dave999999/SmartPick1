-- =====================================================
-- REVERT BAD RLS POLICIES AND FIX PROPERLY
-- =====================================================

-- 1. Drop the problematic policies that are causing infinite loops
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all user_points" ON public.user_points;
DROP POLICY IF EXISTS "Admins can view all point_transactions" ON public.point_transactions;

-- 2. Check if RLS is even enabled on these tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'user_points', 'point_transactions');

-- 3. If RLS is enabled, add SIMPLE policies (no subqueries that cause loops)
-- Users table: Everyone can see their own row
CREATE POLICY "Users can view own data"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- user_points table: Everyone can see their own points
CREATE POLICY "Users can view own points"
  ON public.user_points FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- point_transactions table: Everyone can see their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.point_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Grant table permissions
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.user_points TO authenticated;
GRANT SELECT ON public.point_transactions TO authenticated;

-- 5. Verify you're still admin
SELECT 
  id,
  email,
  role,
  'You are admin!' as status
FROM public.users
WHERE id = auth.uid();
