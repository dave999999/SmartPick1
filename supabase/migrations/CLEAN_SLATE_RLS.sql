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

-- 4. Recreate the function with fixed admin check
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
  -- Admin check with table alias to avoid ambiguous column
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

-- 5. Test that the function works
SELECT COUNT(*) as total_users
FROM get_users_with_points_summary(NULL, 100, 0);
