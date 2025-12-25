-- Create lift_cooldown_with_points function for paid cooldown lifting

DROP FUNCTION IF EXISTS lift_cooldown_with_points(UUID, INTEGER);
DROP FUNCTION IF EXISTS lift_cooldown_with_points(UUID);

CREATE OR REPLACE FUNCTION lift_cooldown_with_points(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, points_spent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancel_count INTEGER;
  v_user_points INTEGER;
  v_points_cost INTEGER := 100; -- Fixed cost for 4th cancellation
  v_georgia_date DATE;
BEGIN
  -- Get current date in Georgia timezone (same as is_user_in_cooldown)
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  -- Get current cancellation count for today (Georgia time)
  SELECT COUNT(*)
  INTO v_cancel_count
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date;
  
  -- Must have 4 cancellations to use paid lift
  IF v_cancel_count < 4 THEN
    RETURN QUERY SELECT FALSE, 'არ გჭირდებათ შეზღუდვის მოხსნა'::TEXT, 0;
    RETURN;
  END IF;
  
  -- Get user's current points balance from user_points table
  SELECT balance INTO v_user_points
  FROM user_points
  WHERE user_id = p_user_id;
  
  -- Check if user has enough points
  IF v_user_points IS NULL OR v_user_points < v_points_cost THEN
    RETURN QUERY SELECT FALSE, 'არასაკმარისი ბალანსი. საჭიროა 100 ქულა.'::TEXT, 0;
    RETURN;
  END IF;
  
  -- Deduct points from user
  UPDATE user_points
  SET balance = balance - v_points_cost
  WHERE user_id = p_user_id;
  
  -- Record the paid cooldown lift
  INSERT INTO user_cooldown_lifts (user_id, cancellation_count_at_lift, lift_type, points_spent)
  VALUES (p_user_id, v_cancel_count, 'paid', v_points_cost);
  
  RETURN QUERY SELECT TRUE, 'შეზღუდვა წარმატებით მოიხსნა! დახარჯული 100 ქულა.'::TEXT, v_points_cost;
END;
$$;

GRANT EXECUTE ON FUNCTION lift_cooldown_with_points TO authenticated;

-- Test it
SELECT * FROM lift_cooldown_with_points('ceb0217b-26f6-445a-a8b2-3807401deca9');
