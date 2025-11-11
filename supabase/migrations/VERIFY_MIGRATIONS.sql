-- =====================================================
-- VERIFICATION SCRIPT - Run this AFTER applying migrations
-- =====================================================
-- This script checks if all migrations were applied successfully

-- 1. Check if functions exist
SELECT 
  routine_name,
  'EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_users_with_points_summary',
    'get_user_growth_stats',
    'get_top_partners',
    'get_category_stats',
    'get_user_retention_stats',
    'get_peak_usage_times'
  )
ORDER BY routine_name;

-- Expected: 6 functions should be listed

-- 2. Test get_users_with_points_summary (should exclude admin)
SELECT 
  user_id,
  name,
  email,
  role
FROM get_users_with_points_summary()
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Should show CUSTOMER and PARTNER users, NOT ADMIN

-- 3. Test get_user_growth_stats
SELECT * FROM get_user_growth_stats()
ORDER BY date ASC
LIMIT 10;

-- Expected: Should show last 30 days of user growth

-- 4. Test get_top_partners
SELECT * FROM get_top_partners(5);

-- Expected: Should show top 5 partners (may be empty if no data)

-- 5. Check if admin is excluded from users query
SELECT COUNT(*) as admin_count
FROM users
WHERE role = 'ADMIN';

-- Expected: Should show at least 1 (your admin user)

-- 6. Check if admin is excluded from the function
SELECT COUNT(*) as admin_in_function
FROM get_users_with_points_summary()
WHERE role = 'ADMIN';

-- Expected: Should show 0 (admins excluded)

-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================
-- If Query 1 shows 6 functions: ✅ Analytics migration applied
-- If Query 2 shows no ADMIN users: ✅ User filter migration applied
-- If Query 3 shows data: ✅ Analytics working
-- If Query 6 shows 0: ✅ Admin exclusion working

-- =====================================================
-- IF TESTS FAIL, RUN THESE FIXES
-- =====================================================

-- Fix 1: If functions don't exist, run the analytics migration again
-- Fix 2: If admin users still appear, run this:
/*
CREATE OR REPLACE FUNCTION get_users_with_points_summary(
  p_role VARCHAR DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  email TEXT,
  role VARCHAR,
  is_banned BOOLEAN,
  current_points INTEGER,
  total_purchased INTEGER,
  total_claimed INTEGER,
  total_gel_spent DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    u.name,
    u.email,
    u.role,
    u.is_banned,
    u.points as current_points,
    COALESCE(purchases.total, 0)::INTEGER as total_purchased,
    COALESCE(claims.total, 0)::INTEGER as total_claimed,
    COALESCE(purchases.total_gel, 0)::DECIMAL as total_gel_spent,
    u.created_at,
    u.last_login
  FROM public.users u
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
    AND u.role != 'ADMIN' -- CRITICAL: EXCLUDE ADMIN USERS
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_users_with_points_summary TO authenticated;
*/
