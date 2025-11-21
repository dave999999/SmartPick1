-- =====================================================
-- FIX: Make admin functions bypass RLS properly
-- =====================================================

-- The issue: SECURITY DEFINER functions need to bypass RLS
-- Solution: Add SET search_path and make them properly bypass RLS

-- 1. Fix get_users_with_points_summary to bypass RLS
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
  -- Admin check
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin only';
  END IF;

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

-- 2. Remove the overly restrictive RLS policies we just added
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can view all user_points" ON public.user_points;
DROP POLICY IF EXISTS "Admins can view all point_transactions" ON public.point_transactions;

-- 3. Add simpler policies that allow function execution
-- Users table: Allow users to see themselves + admins see all
CREATE POLICY "Users can view own data or admin sees all"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- user_points table: Allow users to see their own + admins see all
CREATE POLICY "Users can view own points or admin sees all"
  ON public.user_points FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- point_transactions table: Allow users to see their own + admins see all
CREATE POLICY "Users can view own transactions or admin sees all"
  ON public.point_transactions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'ADMIN'
    )
  );

-- 4. Verify setup
SELECT 'RLS policies fixed - functions should work now' as status;
