-- =====================================================
-- FIX: can_user_reserve() Column Ambiguity
-- Run this to fix the "suspended_until" ambiguous error
-- =====================================================

-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS can_user_reserve(UUID) CASCADE;

CREATE OR REPLACE FUNCTION can_user_reserve(p_user_id UUID)
RETURNS TABLE(can_reserve BOOLEAN, reason TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_status TEXT;
  v_is_suspended BOOLEAN;
  v_suspended_until TIMESTAMPTZ;  -- Renamed with v_ prefix
  v_active_penalty RECORD;
  v_is_in_cooldown BOOLEAN;
BEGIN
  -- Get user status
  SELECT status, is_suspended, users.suspended_until  -- Qualified column name
  INTO v_user_status, v_is_suspended, v_suspended_until
  FROM users
  WHERE id = p_user_id;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'User not found';
    RETURN;
  END IF;
  
  -- Check if permanently banned
  IF v_user_status = 'BANNED' THEN
    RETURN QUERY SELECT false, 'User is permanently banned';
    RETURN;
  END IF;
  
  -- Check for active penalties (using alias up to avoid ambiguity)
  SELECT up.* INTO v_active_penalty
  FROM user_penalties up
  WHERE up.user_id = p_user_id 
    AND up.is_active = true
    AND (up.suspended_until IS NULL OR up.suspended_until > NOW())  -- Qualified with alias
  ORDER BY up.created_at DESC
  LIMIT 1;
  
  IF v_active_penalty.penalty_type IS NOT NULL THEN
    IF v_active_penalty.penalty_type = 'PERMANENT_BAN' THEN
      RETURN QUERY SELECT false, 'User has permanent ban penalty';
      RETURN;
    ELSIF v_active_penalty.penalty_type = 'BAN_24H' THEN
      RETURN QUERY SELECT false, 'User is banned for 24 hours (until ' || v_active_penalty.suspended_until::TEXT || ')';
      RETURN;
    ELSIF v_active_penalty.penalty_type = 'SUSPENSION_1H' THEN
      RETURN QUERY SELECT false, 'User is suspended for 1 hour (until ' || v_active_penalty.suspended_until::TEXT || ')';
      RETURN;
    END IF;
  END IF;
  
  -- Check if currently suspended (user table field)
  IF v_is_suspended AND v_suspended_until > NOW() THEN
    RETURN QUERY SELECT false, 'User is currently suspended until ' || v_suspended_until::TEXT;
    RETURN;
  END IF;
  
  -- Check cancellation cooldown
  SELECT * INTO v_is_in_cooldown FROM is_user_in_cooldown(p_user_id);
  
  IF v_is_in_cooldown THEN
    RETURN QUERY SELECT false, 'Too many cancellations in short period. Please wait 30 minutes.';
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT true, 'User can reserve';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_user_reserve(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_reserve(UUID) TO anon;

SELECT '✅ Fixed can_user_reserve() - Column ambiguity resolved' as result;
