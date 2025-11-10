-- ================================================
-- COMPLETE FIX: Update trigger + test tracking
-- Run this in Supabase SQL Editor
-- ================================================

BEGIN;

-- ================================================
-- STEP 1: Update the trigger function (customer_id fix)
-- ================================================

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

  v_pickup_date := COALESCE(NEW.picked_up_at::DATE, CURRENT_DATE);

  -- Calculate money saved
  SELECT (o.original_price - o.smart_price) * NEW.quantity, o.category
  INTO v_money_saved, v_offer_category
  FROM offers o WHERE o.id = NEW.offer_id;

  -- ✅ CRITICAL FIX: Use customer_id (not user_id!)
  UPDATE user_stats
  SET total_reservations = total_reservations + 1,
      total_money_saved = total_money_saved + COALESCE(v_money_saved, 0),
      last_activity_date = v_pickup_date,
      updated_at = now()
  WHERE user_id = NEW.customer_id;

  -- Update streak and check achievements
  PERFORM update_user_streak_on_date(NEW.customer_id, v_pickup_date);
  PERFORM check_user_achievements(NEW.customer_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- STEP 2: Verify trigger is attached
-- ================================================

DROP TRIGGER IF EXISTS update_user_stats_on_pickup_trigger ON reservations;

CREATE TRIGGER update_user_stats_on_pickup_trigger
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_pickup();

-- ================================================
-- STEP 3: Ensure all users have user_stats rows
-- ================================================

INSERT INTO user_stats (user_id, total_reservations, total_money_saved, current_streak_days, longest_streak_days)
SELECT 
  u.id,
  0,
  0.00,
  0,
  0
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_stats WHERE user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- 1. Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'update_user_stats_on_pickup_trigger';

-- 2. Check user_stats rows
SELECT COUNT(*) as users_with_stats FROM user_stats;

-- 3. Show current stats for all users
SELECT 
  u.email,
  COALESCE(us.total_reservations, 0) as reservations,
  COALESCE(us.total_money_saved, 0) as money_saved,
  COALESCE(us.current_streak_days, 0) as streak
FROM users u
LEFT JOIN user_stats us ON us.user_id = u.id
WHERE u.role = 'customer'
ORDER BY u.created_at DESC
LIMIT 10;
