-- Fix: Exclude ADMIN users from get_users_with_points_summary function
-- This ensures the Users tab and New Users tab don't show admin users

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
    SELECT user_id, SUM(change) as total, SUM(amount_paid_gel) as total_gel
    FROM public.point_transactions
    WHERE reason IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
      AND change > 0
    GROUP BY user_id
  ) purchases ON purchases.user_id = u.id
  LEFT JOIN (
    SELECT user_id, SUM(change) as total
    FROM public.point_transactions
    WHERE change > 0
      AND amount_paid_gel IS NULL
      AND reason NOT IN ('POINTS_PURCHASED', 'purchase', 'PURCHASE')
    GROUP BY user_id
  ) claims ON claims.user_id = u.id
  WHERE (p_role IS NULL OR u.role = p_role)
    AND u.role != 'ADMIN' -- EXCLUDE ADMIN USERS
  ORDER BY u.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_users_with_points_summary TO authenticated;
