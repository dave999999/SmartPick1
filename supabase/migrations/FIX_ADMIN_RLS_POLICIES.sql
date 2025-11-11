-- =====================================================
-- FIX ADMIN RLS POLICIES - Allow admin to call functions
-- =====================================================

-- 1. Create admin check function if it doesn't exist
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant permissions on users table for admin checks
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.user_points TO authenticated;
GRANT SELECT ON public.point_transactions TO authenticated;

-- 3. Ensure RLS allows admins to query users table
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_check
      WHERE admin_check.id = auth.uid()
        AND admin_check.role = 'ADMIN'
    )
  );

-- 4. Ensure RLS allows admins to query user_points table
DROP POLICY IF EXISTS "Admins can view all user_points" ON public.user_points;
CREATE POLICY "Admins can view all user_points"
  ON public.user_points FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_check
      WHERE admin_check.id = auth.uid()
        AND admin_check.role = 'ADMIN'
    )
  );

-- 5. Ensure RLS allows admins to query point_transactions table
DROP POLICY IF EXISTS "Admins can view all point_transactions" ON public.point_transactions;
CREATE POLICY "Admins can view all point_transactions"
  ON public.point_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin_check
      WHERE admin_check.id = auth.uid()
        AND admin_check.role = 'ADMIN'
    )
  );

-- 6. Verify your admin user exists
SELECT 
  id,
  email,
  role,
  'Admin user found' as status
FROM public.users
WHERE role = 'ADMIN'
LIMIT 1;

-- If no admin found, you need to update your user:
-- UPDATE public.users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
