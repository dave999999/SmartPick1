-- =========================================================
-- AUDIT LOGGING FUNCTION
-- =========================================================
-- Purpose: Centralized function to log all admin actions
-- Usage: PERFORM log_admin_action(...) at end of admin functions

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS log_admin_action CASCADE;

CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'INFO',
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id UUID;
  v_admin_email TEXT;
  v_admin_name TEXT;
BEGIN
  -- Get admin info
  SELECT email, name INTO v_admin_email, v_admin_name
  FROM users
  WHERE id = auth.uid();

  -- If description not provided, generate from action type
  IF p_description IS NULL THEN
    p_description := REPLACE(p_action_type, '_', ' ');
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    admin_user_id,
    admin_email,
    admin_name,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    action_description,
    before_state,
    after_state,
    metadata,
    severity,
    success,
    error_message,
    created_at
  ) VALUES (
    auth.uid(),
    v_admin_email,
    v_admin_name,
    p_action_type::audit_action_type,
    p_entity_type::audit_entity_type,
    p_entity_id,
    p_entity_name,
    p_description,
    p_before_state,
    p_after_state,
    COALESCE(p_metadata, '{}'::jsonb),
    p_severity::audit_severity,
    p_success,
    p_error_message,
    NOW()
  )
  RETURNING id INTO v_log_id;

  -- Log success
  RAISE NOTICE 'Audit log created: % by % (%) - %', 
    v_log_id, v_admin_name, v_admin_email, p_action_type;

  RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_admin_action IS 
  'Centralized audit logging function. Call at end of admin operations.
   Automatically captures admin user info, timestamps, and validates types.
   Returns UUID of created audit log entry.';

-- Helper function: Log system settings change
CREATE OR REPLACE FUNCTION log_system_setting_change(
  p_setting_key TEXT,
  p_old_value JSONB,
  p_new_value JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN log_admin_action(
    'SYSTEM_SETTING_CHANGED',
    'SYSTEM',
    NULL,
    p_setting_key,
    format('System setting "%s" changed', p_setting_key),
    jsonb_build_object('old_value', p_old_value),
    jsonb_build_object('new_value', p_new_value),
    jsonb_build_object('setting_key', p_setting_key)
  );
END;
$$;

-- Helper function: Log user ban
CREATE OR REPLACE FUNCTION log_user_ban(
  p_user_id UUID,
  p_user_email TEXT,
  p_ban_type TEXT,
  p_reason TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN log_admin_action(
    'USER_BANNED',
    'USER',
    p_user_id,
    p_user_email,
    format('User %s banned: %s', p_user_email, p_ban_type),
    jsonb_build_object('was_banned', false),
    jsonb_build_object('is_banned', true, 'ban_type', p_ban_type, 'expires_at', p_expires_at),
    jsonb_build_object('reason', p_reason, 'ban_type', p_ban_type),
    'WARNING'
  );
END;
$$;

-- Helper function: Log points granted
CREATE OR REPLACE FUNCTION log_points_transaction(
  p_user_id UUID,
  p_user_email TEXT,
  p_points INT,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_action_type TEXT;
  v_description TEXT;
BEGIN
  v_action_type := CASE WHEN p_points >= 0 THEN 'POINTS_GRANTED' ELSE 'POINTS_DEDUCTED' END;
  v_description := format('%s %s points for %s: %s', 
    CASE WHEN p_points >= 0 THEN 'Granted' ELSE 'Deducted' END,
    ABS(p_points),
    p_user_email,
    p_reason
  );

  RETURN log_admin_action(
    v_action_type,
    'USER',
    p_user_id,
    p_user_email,
    v_description,
    NULL,
    jsonb_build_object('points_changed', p_points),
    jsonb_build_object('reason', p_reason, 'points', p_points)
  );
END;
$$;

-- Verify functions created
SELECT 
  '=== AUDIT LOGGING FUNCTIONS CREATED ===' as status,
  'Use log_admin_action() in admin functions' as usage;

-- Show created functions
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('log_admin_action', 'log_system_setting_change', 'log_user_ban', 'log_points_transaction')
ORDER BY proname;

-- Example usage:
/*

-- In update_system_setting function:
PERFORM log_system_setting_change(
  p_setting_key,
  v_old_value,
  p_setting_value
);

-- In admin_ban_user function:
PERFORM log_user_ban(
  p_user_id,
  v_user_email,
  p_ban_type,
  p_reason,
  p_expires_at
);

-- In admin_grant_points function:
PERFORM log_points_transaction(
  p_user_id,
  v_user_email,
  p_points,
  p_reason
);

-- Generic usage:
PERFORM log_admin_action(
  'PARTNER_APPROVED',
  'PARTNER',
  p_partner_id,
  v_partner_name,
  'Partner application approved',
  jsonb_build_object('status', 'PENDING'),
  jsonb_build_object('status', 'APPROVED'),
  jsonb_build_object('notes', p_approval_notes)
);

*/
