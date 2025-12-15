# Apply Final RLS Fix to Make Customers Visible

## The Problem
- The old `get_users_with_points_summary` function has issues
- You need to apply the updated version from `FINAL_RLS_FIX.sql`

## Solution: Run This in Supabase SQL Editor

Copy and paste the entire `FINAL_RLS_FIX.sql` file into Supabase SQL Editor and run it.

**OR** run this quick version:

```sql
-- Drop and recreate the function with the fixed version
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
    AND u.role != 'ADMIN'
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_users_with_points_summary TO authenticated;

-- Test it
SELECT COUNT(*) as customer_count FROM get_users_with_points_summary('CUSTOMER', 100, 0);
SELECT COUNT(*) as partner_count FROM get_users_with_points_summary('PARTNER', 100, 0);
```

## After Running
1. Hard refresh your browser (Ctrl + Shift + R)
2. Go to Users tab - customers should now appear!
