-- ============================================
-- FIX ACHIEVEMENT TRACKING - Critical Bug Fix
-- Date: 2025-11-11
-- ============================================
-- Issue: Trigger was using NEW.user_id but reservations table has customer_id
-- Impact: Achievements never unlocked, stats never updated
-- Fix: Update all references to use customer_id

BEGIN;

-- ============================================
-- 1. FIX THE TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_user_stats_on_pickup()
RETURNS TRIGGER AS $$
DECLARE
  v_money_saved DECIMAL(10, 2);
  v_offer_category TEXT;
  v_partner_id UUID;
  v_pickup_date DATE;
BEGIN
  -- Only proceed if status changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  -- Use the actual pickup date
  v_pickup_date := COALESCE(NEW.picked_up_at::DATE, CURRENT_DATE);

  -- Get offer details (price saved, category, partner)
  SELECT
    (o.original_price - o.smart_price) * NEW.quantity,
    o.category,
    o.partner_id
  INTO v_money_saved, v_offer_category, v_partner_id
  FROM offers o
  WHERE o.id = NEW.offer_id;

  -- Update user stats (FIXED: use customer_id instead of user_id!)
  UPDATE user_stats
  SET
    total_reservations = total_reservations + 1,
    total_money_saved = total_money_saved + COALESCE(v_money_saved, 0),
    last_activity_date = v_pickup_date,
    
    -- Update category counts (for category-specific achievements)
    category_counts = jsonb_set(
      COALESCE(category_counts, '{}'::jsonb),
      ARRAY[v_offer_category],
      to_jsonb(COALESCE((category_counts->>v_offer_category)::INTEGER, 0) + 1)
    ),
    
    -- Update partner visit counts (for partner loyalty achievements)
    partner_visit_counts = jsonb_set(
      COALESCE(partner_visit_counts, '{}'::jsonb),
      ARRAY[v_partner_id::TEXT],
      to_jsonb(COALESCE((partner_visit_counts->>v_partner_id::TEXT)::INTEGER, 0) + 1)
    ),
    
    updated_at = now()
  WHERE user_id = NEW.customer_id; -- ✅ FIXED: was NEW.user_id

  -- Recalculate unique partners count (for "Local Hero" achievement)
  UPDATE user_stats
  SET unique_partners_visited = (
    SELECT COUNT(DISTINCT key)
    FROM jsonb_object_keys(partner_visit_counts)
  )
  WHERE user_id = NEW.customer_id; -- ✅ FIXED: was NEW.user_id

  -- Update streak (FIXED: use customer_id!)
  PERFORM update_user_streak_on_date(NEW.customer_id, v_pickup_date);

  -- Check for new achievements (FIXED: use customer_id!)
  PERFORM check_user_achievements(NEW.customer_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp; -- Added search_path for security

COMMENT ON FUNCTION update_user_stats_on_pickup() IS 
  'Updates user gamification stats when reservation is picked up. FIXED to use customer_id column.';

-- ============================================
-- 2. RECREATE TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS update_stats_on_pickup ON reservations;

CREATE TRIGGER update_stats_on_pickup
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  WHEN (NEW.status = 'PICKED_UP' AND OLD.status != 'PICKED_UP')
  EXECUTE FUNCTION update_user_stats_on_pickup();

COMMENT ON TRIGGER update_stats_on_pickup ON reservations IS
  'Triggers gamification updates when reservation status becomes PICKED_UP';

-- ============================================
-- 3. FIX REFERRAL TRIGGER (if it exists)
-- ============================================

-- Check if there's a referral points trigger and fix it too
CREATE OR REPLACE FUNCTION grant_referral_points()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Only proceed if user was referred
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;

  v_referrer_id := NEW.referred_by;

  -- Award points to referrer
  PERFORM add_user_points(
    v_referrer_id,
    50,
    'referral_bonus',
    jsonb_build_object('referred_user_id', NEW.id, 'referred_user_name', NEW.name)
  );

  -- Award points to new user
  PERFORM add_user_points(
    NEW.id,
    50,
    'referral_signup',
    jsonb_build_object('referrer_id', v_referrer_id)
  );

  -- Increment referrer's total_referrals count
  UPDATE user_stats
  SET 
    total_referrals = total_referrals + 1,
    updated_at = NOW()
  WHERE user_id = v_referrer_id;

  -- Check if referrer unlocked referral achievements
  PERFORM check_user_achievements(v_referrer_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMIT;

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Achievement tracking trigger fixed!';
  RAISE NOTICE '✅ Now uses customer_id instead of user_id';
  RAISE NOTICE '✅ Run backfill migration next to update existing users';
END $$;
