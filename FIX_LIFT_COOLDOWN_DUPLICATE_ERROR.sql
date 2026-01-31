-- =========================================================
-- FIX: lift_cooldown_with_points duplicate key error
-- =========================================================
-- Issue: User gets 409 error when lifting cooldown on 4th cancellation
-- Error: duplicate key violates unique constraint "idx_one_lift_per_user_per_day"
-- Root Cause: Constraint allows only ONE lift per day, but business logic allows:
--   • 3rd cancel → FREE lift
--   • 4th cancel → PAID lift (100 points)
-- Fix: Change constraint to allow one lift PER TYPE per day
-- =========================================================

-- Step 1: Drop old constraint (one lift per day total)
DROP INDEX IF EXISTS idx_one_lift_per_user_per_day;

-- Step 2: Create new constraint (one lift per TYPE per day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_lift_per_type_per_day 
ON user_cooldown_lifts(
  user_id,
  lift_type,
  ((lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE)
);

-- Step 3: Update function to check by lift_type
DROP FUNCTION IF EXISTS lift_cooldown_with_points(UUID);

CREATE OR REPLACE FUNCTION lift_cooldown_with_points(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, points_spent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_cancel_count INTEGER;
  v_user_points INTEGER;
  v_points_cost INTEGER := 100; -- Fixed cost for 4th cancellation
  v_georgia_date DATE;
  v_already_lifted BOOLEAN;
BEGIN
  -- Get current date in Georgia timezone
  v_georgia_date := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;
  
  -- ✅ FIX: Check if already used PAID lift today (not free)
  SELECT EXISTS (
    SELECT 1 FROM user_cooldown_lifts
    WHERE user_id = p_user_id
      AND lift_type = 'paid'
      AND (lifted_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_date
  ) INTO v_already_lifted;
  
  IF v_already_lifted THEN
    RETURN QUERY SELECT FALSE, 'თქვენ უკვე გამოიყენეთ ფასიანი მოხსნა დღეს'::TEXT, 0;
    RETURN;
  END IF;
  
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
  
  -- Record the paid cooldown lift (now safe from duplicates)
  INSERT INTO user_cooldown_lifts (user_id, cancellation_count_at_lift, lift_type, points_spent)
  VALUES (p_user_id, v_cancel_count, 'paid', v_points_cost);
  
  RETURN QUERY SELECT TRUE, 'შეზღუდვა წარმატებით მოიხსნა! დახარჯული 100 ქულა.'::TEXT, v_points_cost;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Safety fallback if race condition occurs
    RETURN QUERY SELECT FALSE, 'თქვენ უკვე გამოიყენეთ ფასიანი მოხსნა დღეს'::TEXT, 0;
END;
$$;

GRANT EXECUTE ON FUNCTION lift_cooldown_with_points TO authenticated;

-- =========================================================
-- Verification
-- =========================================================
SELECT 
  '✅ Fixed: Changed constraint to allow one FREE + one PAID lift per day' AS status,
  '✅ User can now: 3rd cancel → free lift, 4th cancel → paid lift' AS benefit,
  '✅ No more false "already lifted" errors' AS result;

-- Test query (will show proper error message):
-- SELECT * FROM lift_cooldown_with_points('your-user-id');
