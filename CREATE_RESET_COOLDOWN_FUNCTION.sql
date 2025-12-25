-- Create/Update reset_user_cooldown function for daily cancellation tracking

DROP FUNCTION IF EXISTS reset_user_cooldown(UUID);

CREATE OR REPLACE FUNCTION reset_user_cooldown(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancel_count INTEGER;
  v_reset_count INTEGER;
BEGIN
  -- Get current cancellation and reset count for today
  SELECT 
    COUNT(*),
    MAX(COALESCE(reset_count, 0))
  INTO v_cancel_count, v_reset_count
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND cancelled_at >= CURRENT_DATE;
  
  -- Must have 3+ cancellations to need reset
  IF v_cancel_count < 3 THEN
    RETURN QUERY SELECT FALSE, 'No active cooldown to reset'::TEXT;
    RETURN;
  END IF;
  
  -- Check if this is first time (free reset)
  IF v_reset_count = 0 THEN
    -- Record that user lifted cooldown (FREE - first time)
    INSERT INTO user_cooldown_lifts (user_id, cancellation_count_at_lift, lift_type, points_spent)
    VALUES (p_user_id, v_cancel_count, 'free', 0);
    
    RETURN QUERY SELECT TRUE, 'Cooldown lifted! You can now make a reservation. Be careful with cancellations!'::TEXT;
    RETURN;
  END IF;
  
  -- If already used free reset, they need to pay points (handled by different function)
  RETURN QUERY SELECT FALSE, 'You already used your free reset. Use paid lift option.'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_user_cooldown TO authenticated;

-- Test it
SELECT * FROM reset_user_cooldown('ceb0217b-26f6-445a-a8b2-3807401deca9');
