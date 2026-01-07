-- =========================================================
-- UPDATE EXISTING ADMIN FUNCTIONS WITH AUDIT LOGGING
-- =========================================================
-- Purpose: Add audit logging to existing admin functions
-- Run this after CREATE_AUDIT_LOG_FUNCTION.sql

-- 1. Update update_system_setting to include audit logging
CREATE OR REPLACE FUNCTION update_system_setting(
  p_setting_key TEXT,
  p_setting_value JSONB,
  p_admin_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_result JSONB;
  v_old_value JSONB;
BEGIN
  -- Check if user is admin
  SELECT role = 'ADMIN' INTO v_is_admin
  FROM users
  WHERE id = p_admin_user_id;
  
  IF v_is_admin IS NULL OR v_is_admin = FALSE THEN
    RAISE EXCEPTION 'Access denied: User is not an admin';
  END IF;

  -- Get old value for audit log
  SELECT value INTO v_old_value
  FROM system_settings
  WHERE key = p_setting_key;
  
  -- Update or insert the setting
  INSERT INTO system_settings (key, value, updated_by, created_at, updated_at)
  VALUES (p_setting_key, p_setting_value, p_admin_user_id, NOW(), NOW())
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = p_setting_value,
    updated_by = p_admin_user_id,
    updated_at = NOW()
  RETURNING value INTO v_result;

  -- Log the change
  PERFORM log_system_setting_change(
    p_setting_key,
    v_old_value,
    p_setting_value
  );
  
  RETURN v_result;
END;
$$;

-- 2. Create admin_ban_user function with audit logging
CREATE OR REPLACE FUNCTION admin_ban_user(
  p_user_email TEXT,
  p_reason TEXT,
  p_ban_type TEXT DEFAULT 'PERMANENT',
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_is_admin BOOLEAN;
  v_ban_id UUID;
BEGIN
  -- Check if caller is admin
  SELECT role = 'ADMIN' INTO v_is_admin
  FROM users
  WHERE id = auth.uid();
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Find user
  SELECT id, name INTO v_user_id, v_user_name
  FROM auth.users au
  JOIN users u ON au.id = u.id
  WHERE au.email = p_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_email;
  END IF;

  -- Check if user is already banned
  IF EXISTS (SELECT 1 FROM user_bans WHERE user_id = v_user_id AND is_active = TRUE) THEN
    RAISE EXCEPTION 'User is already banned';
  END IF;

  -- Create ban record
  INSERT INTO user_bans (
    user_id,
    banned_by,
    ban_type,
    reason,
    expires_at,
    notes,
    is_active,
    banned_at
  ) VALUES (
    v_user_id,
    auth.uid(),
    p_ban_type,
    p_reason,
    p_expires_at,
    p_notes,
    TRUE,
    NOW()
  )
  RETURNING id INTO v_ban_id;

  -- Log the action
  PERFORM log_user_ban(
    v_user_id,
    p_user_email,
    p_ban_type,
    p_reason,
    p_expires_at
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'ban_id', v_ban_id,
    'user_id', v_user_id,
    'user_email', p_user_email,
    'ban_type', p_ban_type
  );
END;
$$;

-- 3. Create admin_grant_points function with audit logging
CREATE OR REPLACE FUNCTION admin_grant_points(
  p_user_email TEXT,
  p_points INT,
  p_reason TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_name TEXT;
  v_old_balance INT;
  v_new_balance INT;
  v_is_admin BOOLEAN;
  v_transaction_id UUID;
BEGIN
  -- Check if caller is admin
  SELECT role = 'ADMIN' INTO v_is_admin
  FROM users
  WHERE id = auth.uid();
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Find user and current balance
  SELECT u.id, u.name, u.points 
  INTO v_user_id, v_user_name, v_old_balance
  FROM auth.users au
  JOIN users u ON au.id = u.id
  WHERE au.email = p_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_email;
  END IF;

  -- Update user points
  UPDATE users
  SET points = points + p_points,
      updated_at = NOW()
  WHERE id = v_user_id
  RETURNING points INTO v_new_balance;

  -- Create transaction record
  INSERT INTO point_transactions (
    user_id,
    points,
    reason,
    admin_notes,
    created_at
  ) VALUES (
    v_user_id,
    p_points,
    CASE WHEN p_points >= 0 THEN 'ADMIN_GRANT' ELSE 'ADMIN_DEDUCT' END,
    jsonb_build_object('reason', p_reason, 'notes', p_admin_notes),
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  -- Log the action
  PERFORM log_points_transaction(
    v_user_id,
    p_user_email,
    p_points,
    p_reason
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'transaction_id', v_transaction_id,
    'user_id', v_user_id,
    'user_email', p_user_email,
    'old_balance', v_old_balance,
    'new_balance', v_new_balance,
    'points_changed', p_points
  );
END;
$$;

-- 4. Create admin_unban_user function with audit logging
CREATE OR REPLACE FUNCTION admin_unban_user(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_user_email TEXT;
  v_ban_id UUID;
BEGIN
  -- Check if caller is admin
  SELECT role = 'ADMIN' INTO v_is_admin
  FROM users
  WHERE id = auth.uid();
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Deactivate ban
  UPDATE user_bans
  SET is_active = FALSE,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND is_active = TRUE
  RETURNING id INTO v_ban_id;

  IF v_ban_id IS NULL THEN
    RAISE EXCEPTION 'No active ban found for this user';
  END IF;

  -- Log the action
  PERFORM log_admin_action(
    'USER_UNBANNED',
    'USER',
    p_user_id,
    v_user_email,
    format('User %s has been unbanned', v_user_email),
    jsonb_build_object('is_banned', TRUE),
    jsonb_build_object('is_banned', FALSE),
    jsonb_build_object('ban_id', v_ban_id),
    'WARNING'
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', p_user_id,
    'user_email', v_user_email
  );
END;
$$;

-- Verify functions created/updated
SELECT 
  '=== ADMIN FUNCTIONS UPDATED WITH AUDIT LOGGING ===' as status,
  'All admin actions will now be logged automatically' as message;

-- Show updated functions
SELECT 
  routine_name as function_name,
  string_agg(parameter_name || ' ' || data_type, ', ' ORDER BY ordinal_position) as parameters
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name IN ('update_system_setting', 'admin_ban_user', 'admin_grant_points', 'admin_unban_user')
GROUP BY routine_name
ORDER BY routine_name;

COMMENT ON FUNCTION update_system_setting IS 'Update system settings with audit logging';
COMMENT ON FUNCTION admin_ban_user IS 'Ban a user by email with audit logging';
COMMENT ON FUNCTION admin_grant_points IS 'Grant or deduct points with audit logging';
COMMENT ON FUNCTION admin_unban_user IS 'Unban a user with audit logging';
