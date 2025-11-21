-- Safe Admin Analytics RPC Function
-- This function runs with SECURITY DEFINER to bypass RLS safely
-- Uses a safer admin check via users table role column

CREATE OR REPLACE FUNCTION admin_get_analytics_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  is_admin boolean;
BEGIN
  -- Security: Verify caller is admin by checking users.role column
  SELECT (role = 'ADMIN') INTO is_admin
  FROM users
  WHERE id = auth.uid();
  
  IF is_admin IS NULL OR is_admin = false THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Fetch all data needed for analytics
  SELECT jsonb_build_object(
    'users', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'created_at', created_at,
        'last_seen', last_seen
      ))
      FROM users
    ),
    'reservations', (
      SELECT jsonb_agg(jsonb_build_object(
        'user_id', user_id,
        'smart_price', smart_price,
        'status', status,
        'created_at', created_at
      ))
      FROM reservations
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Safe Admin Live Stats RPC Function
CREATE OR REPLACE FUNCTION admin_get_live_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  is_admin boolean;
BEGIN
  -- Security: Verify caller is admin by checking users.role column
  SELECT (role = 'ADMIN') INTO is_admin
  FROM users
  WHERE id = auth.uid();
  
  IF is_admin IS NULL OR is_admin = false THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Fetch all data needed for live stats
  SELECT jsonb_build_object(
    'users', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'last_seen', last_seen
      ))
      FROM users
    ),
    'partners', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'status', status,
        'updated_at', updated_at
      ))
      FROM partners
    ),
    'offers', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'status', status
      ))
      FROM offers
    ),
    'reservations', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'smart_price', smart_price,
        'status', status,
        'created_at', created_at
      ))
      FROM reservations
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users (function itself checks admin role)
GRANT EXECUTE ON FUNCTION admin_get_analytics_data() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_live_stats() TO authenticated;
