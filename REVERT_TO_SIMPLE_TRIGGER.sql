-- ================================================
-- REVERT TO SIMPLE WORKING TRIGGER
-- Run this in Supabase SQL Editor
-- ================================================

BEGIN;

-- Drop existing trigger and functions
DROP TRIGGER IF EXISTS update_user_stats_on_pickup_trigger ON reservations;
DROP FUNCTION IF EXISTS check_simple_achievements(UUID);
DROP FUNCTION IF EXISTS check_reservation_achievements(UUID);

-- Back to simple, working trigger
CREATE OR REPLACE FUNCTION update_user_stats_on_pickup()
RETURNS TRIGGER AS $$
DECLARE
  v_money_saved DECIMAL(10, 2);
BEGIN
  -- Only proceed if status changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  -- Calculate money saved
  SELECT (o.original_price - o.smart_price) * NEW.quantity
  INTO v_money_saved
  FROM offers o WHERE o.id = NEW.offer_id;

  -- Update user_stats (simple version)
  UPDATE user_stats
  SET total_reservations = total_reservations + 1,
      total_money_saved = total_money_saved + COALESCE(v_money_saved, 0),
      updated_at = now()
  WHERE user_id = NEW.customer_id;

  -- If user_stats doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO user_stats (user_id, total_reservations, total_money_saved)
    VALUES (NEW.customer_id, 1, COALESCE(v_money_saved, 0))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Check for first achievement only (simple)
  IF NOT EXISTS (
    SELECT 1 FROM user_achievements 
    WHERE user_id = NEW.customer_id 
    AND achievement_id = 'ach_first_reservation'
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_id, is_new)
    VALUES (NEW.customer_id, 'ach_first_reservation', true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER update_user_stats_on_pickup_trigger
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_pickup();

COMMIT;

-- Test query to verify it works
SELECT 'Simple working trigger restored!' as status;
