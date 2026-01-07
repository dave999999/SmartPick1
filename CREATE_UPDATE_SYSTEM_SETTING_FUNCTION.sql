-- =========================================================
-- CREATE update_system_setting FUNCTION
-- =========================================================
-- This function allows admins to update system settings
-- Uses SECURITY DEFINER to bypass RLS policies
-- =========================================================

-- Drop if exists to recreate with correct signature
DROP FUNCTION IF EXISTS update_system_setting(TEXT, JSONB, UUID);

CREATE OR REPLACE FUNCTION update_system_setting(
  p_setting_key TEXT,
  p_setting_value JSONB,
  p_admin_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check if user is admin
  SELECT is_admin INTO v_is_admin
  FROM users
  WHERE id = p_admin_user_id;
  
  IF v_is_admin IS NULL OR v_is_admin = FALSE THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;
  
  -- Update or insert the setting
  INSERT INTO system_settings (key, value, updated_at)
  VALUES (p_setting_key, p_setting_value, NOW())
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = p_setting_value,
    updated_at = NOW()
  RETURNING value INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_system_setting(TEXT, JSONB, UUID) TO authenticated;

-- Verify function was created
SELECT 
  'Function created successfully!' as status,
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'update_system_setting';
