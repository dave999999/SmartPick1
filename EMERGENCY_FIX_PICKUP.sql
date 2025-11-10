-- ================================================
-- EMERGENCY FIX: Make pickup work (disable gamification temporarily)
-- Run this in Supabase SQL Editor
-- ================================================

-- Option 1: Disable the trigger temporarily so pickup can work
DROP TRIGGER IF EXISTS update_user_stats_on_pickup_trigger ON reservations;

-- Option 2: Create a simple version that won't fail
CREATE OR REPLACE FUNCTION update_user_stats_on_pickup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  -- Try to update user_stats, but don't fail if it errors
  BEGIN
    UPDATE user_stats
    SET total_reservations = total_reservations + 1,
        total_money_saved = total_money_saved + COALESCE(
          (SELECT (o.original_price - o.smart_price) * NEW.quantity 
           FROM offers o WHERE o.id = NEW.offer_id), 0
        ),
        updated_at = now()
    WHERE user_id = NEW.customer_id;
  EXCEPTION WHEN OTHERS THEN
    -- Silently ignore errors - pickup will still work
    RAISE WARNING 'Failed to update user_stats: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER update_user_stats_on_pickup_trigger
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_pickup();

-- Verify
SELECT 'Trigger updated with error handling' as status;
