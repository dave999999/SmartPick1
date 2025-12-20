-- =====================================================
-- ADD RESET COOLDOWN FUNCTION (Simple Version)
-- =====================================================
-- Creates the missing reset_user_cooldown function
-- that the frontend is trying to call
-- =====================================================

-- Drop existing function first (has different return type)
DROP FUNCTION IF EXISTS reset_user_cooldown(UUID);

CREATE OR REPLACE FUNCTION reset_user_cooldown(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cooldown_active BOOLEAN;
  v_cancel_count INTEGER;
BEGIN
  -- Check if user is in cooldown
  SELECT in_cooldown, cancellation_count
  INTO v_cooldown_active, v_cancel_count
  FROM is_user_in_cooldown(p_user_id);

  -- If no active cooldown, nothing to reset
  IF NOT v_cooldown_active THEN
    RETURN QUERY SELECT FALSE, 'No active cooldown to reset'::TEXT;
    RETURN;
  END IF;

  -- Clear all cancellation history for this user (reset cooldown)
  DELETE FROM user_cancellation_tracking
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT TRUE, 'Cooldown reset successfully! Next cancellation will start fresh.'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_user_cooldown TO authenticated;

COMMENT ON FUNCTION reset_user_cooldown IS 
'One-time reset of user cooldown. Clears all cancellation history.';

SELECT '✅ Added reset_user_cooldown function' as status;
