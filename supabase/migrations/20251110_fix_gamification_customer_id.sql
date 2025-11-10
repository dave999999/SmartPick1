-- Fix gamification trigger to use customer_id instead of user_id
-- The reservations table has customer_id, not user_id
-- This is why achievements weren't being tracked!

BEGIN;

-- Drop and recreate the trigger function with correct column name
CREATE OR REPLACE FUNCTION update_user_stats_on_pickup()
RETURNS TRIGGER AS $$
DECLARE
  v_money_saved DECIMAL(10, 2);
  v_offer_category TEXT;
  v_pickup_date DATE;
BEGIN
  -- Only proceed if status changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  -- Use the actual pickup date, not current date
  v_pickup_date := COALESCE(NEW.picked_up_at::DATE, CURRENT_DATE);

  -- Calculate money saved from the offer
  SELECT
    (o.original_price - o.smart_price) * NEW.quantity,
    o.category
  INTO v_money_saved, v_offer_category
  FROM offers o
  WHERE o.id = NEW.offer_id;

  -- Update user stats (FIX: use customer_id, not user_id!)
  UPDATE user_stats
  SET
    total_reservations = total_reservations + 1,
    total_money_saved = total_money_saved + COALESCE(v_money_saved, 0),
    last_activity_date = v_pickup_date,
    updated_at = now()
  WHERE user_id = NEW.customer_id; -- FIXED: was NEW.user_id

  -- Update streak based on pickup date (FIX: use customer_id!)
  PERFORM update_user_streak_on_date(NEW.customer_id, v_pickup_date); -- FIXED: was NEW.user_id

  -- Check for achievements (FIX: use customer_id!)
  PERFORM check_user_achievements(NEW.customer_id); -- FIXED: was NEW.user_id

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_user_stats_on_pickup() IS 
  'Updates user stats and checks achievements when reservation is picked up. FIXED to use customer_id.';

COMMIT;
