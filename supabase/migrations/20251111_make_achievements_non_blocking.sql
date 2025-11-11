-- ============================================
-- EMERGENCY FIX: Make achievement checking non-blocking
-- Date: 2025-11-11
-- ============================================
-- Issue: If check_user_achievements() fails, it kills the entire pickup transaction
-- Fix: Wrap achievement checking in exception handler so pickup succeeds even if achievements fail

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

  -- Ensure user_stats record exists (create if missing)
  INSERT INTO user_stats (user_id, last_activity_date)
  VALUES (NEW.customer_id, v_pickup_date)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update user stats (use customer_id)
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
  WHERE user_id = NEW.customer_id;

  -- Recalculate unique partners count
  UPDATE user_stats
  SET unique_partners_visited = (
    SELECT COUNT(DISTINCT key)
    FROM jsonb_object_keys(partner_visit_counts)
  )
  WHERE user_id = NEW.customer_id;

  -- Update streak (wrapped in exception handler)
  BEGIN
    PERFORM update_user_streak_on_date(NEW.customer_id, v_pickup_date);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to update streak for user %: %', NEW.customer_id, SQLERRM;
  END;

  -- Check for new achievements (wrapped in exception handler - NON-BLOCKING!)
  BEGIN
    PERFORM check_user_achievements(NEW.customer_id);
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the pickup transaction
    RAISE WARNING 'Failed to check achievements for user %: %', NEW.customer_id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION update_user_stats_on_pickup() IS 
  'Updates user gamification stats when reservation is picked up. Achievement checking is non-blocking to prevent pickup failures.';
