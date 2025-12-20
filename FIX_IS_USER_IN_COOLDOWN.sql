-- =====================================================
-- FIX: is_user_in_cooldown() - Wrong Table Name
-- The function references "cancellation_tracking" 
-- but the actual table is "user_cancellation_tracking"
-- =====================================================

-- Drop and recreate with correct table name
DROP FUNCTION IF EXISTS is_user_in_cooldown(UUID) CASCADE;

CREATE OR REPLACE FUNCTION is_user_in_cooldown(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancel_count INTEGER;
  v_oldest_cancel_time TIMESTAMPTZ;
BEGIN
  -- Count cancellations in the last 30 minutes
  SELECT 
    COUNT(*),
    MIN(cancelled_at)
  INTO 
    v_cancel_count,
    v_oldest_cancel_time
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND cancelled_at > NOW() - INTERVAL '30 minutes';
  
  -- If 3 or more cancellations in 30 minutes, user is in cooldown
  IF v_cancel_count >= 3 THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_user_in_cooldown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_in_cooldown(UUID) TO anon;

SELECT '✅ Fixed is_user_in_cooldown() - Now uses correct table name' as result;
