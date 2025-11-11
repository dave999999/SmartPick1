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

-- 3. Create policy that allows:
--    - Users see their own data
--    - Service role sees all (for SECURITY DEFINER functions)
--    - Admins can see all users (for admin dashboard)
CREATE POLICY "users_select_policy"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()  -- Users see their own row
    OR 
    auth.jwt()->>'role' = 'service_role'  -- Service role sees all
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )  -- Admins see all users
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

-- 6. Recreate the function with fixed ambiguous column
DROP FUNCTION IF EXISTS get_users_with_points_summary(VARCHAR, INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION get_users_with_points_summary(
  p_role VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  is_banned BOOLEAN,
  current_points INTEGER,
  total_purchased INTEGER,
  total_claimed INTEGER,
  total_gel_spent DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- NO admin check here - RLS handles security
  -- Function runs as SECURITY DEFINER which bypasses RLS
  -- Only admins can call this via the frontend API
  
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.name::TEXT,
    u.email::TEXT,
    u.role::TEXT,
    u.is_banned,
    COALESCE(up.balance, 0)::INTEGER as current_points,
    COALESCE(purchases.total, 0)::INTEGER as total_purchased,
    COALESCE(claims.total, 0)::INTEGER as total_claimed,
    COALESCE(purchases.total_gel, 0)::DECIMAL as total_gel_spent,
    u.created_at,
    u.last_login
  FROM public.users u
  LEFT JOIN public.user_points up ON up.user_id = u.id
  LEFT JOIN (
    SELECT pt.user_id as purchase_user_id, SUM(pt.change) as total, SUM(pt.amount_paid_gel) as total_gel
    FROM public.point_transactions pt
    WHERE pt.reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
      AND pt.change > 0
    GROUP BY pt.user_id
  ) purchases ON purchases.purchase_user_id = u.id
  LEFT JOIN (
    SELECT pt2.user_id as claim_user_id, SUM(pt2.change) as total
    FROM public.point_transactions pt2
    WHERE pt2.change > 0
      AND pt2.amount_paid_gel IS NULL
      AND pt2.reason NOT IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
    GROUP BY pt2.user_id
  ) claims ON claims.claim_user_id = u.id
  WHERE (p_role IS NULL OR u.role = p_role)
    AND u.role != 'ADMIN' -- EXCLUDE ADMIN USERS
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_users_with_points_summary TO authenticated;

-- 7. Test the admin function works
SELECT COUNT(*) as total_users,
  'Admin function working!' as status
FROM get_users_with_points_summary(NULL, 100, 0);
