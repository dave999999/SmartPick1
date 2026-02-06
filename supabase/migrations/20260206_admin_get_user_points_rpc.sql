-- ========================================
-- Admin RPC: Fetch User Points in Bulk
-- Date: 2026-02-06
-- ========================================

BEGIN;

CREATE OR REPLACE FUNCTION admin_get_user_points(p_user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  balance INT
) AS $$
DECLARE
  v_admin_role TEXT;
BEGIN
  -- Verify admin role
  SELECT role INTO v_admin_role FROM public.users WHERE id = auth.uid();
  IF v_admin_role IS NULL OR upper(v_admin_role) NOT IN ('ADMIN','SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT up.user_id, up.balance
  FROM public.user_points up
  WHERE up.user_id = ANY(p_user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION admin_get_user_points(UUID[]) SET search_path = public;
GRANT EXECUTE ON FUNCTION admin_get_user_points(UUID[]) TO authenticated;

COMMIT;
