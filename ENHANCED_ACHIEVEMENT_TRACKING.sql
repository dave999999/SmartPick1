-- ================================================
-- ENHANCED TRIGGER: Track More Stats for Achievements
-- Run this in Supabase SQL Editor
-- ================================================

BEGIN;

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_user_stats_on_pickup_trigger ON reservations;

-- Enhanced trigger that tracks more stats
CREATE OR REPLACE FUNCTION update_user_stats_on_pickup()
RETURNS TRIGGER AS $$
DECLARE
  v_money_saved DECIMAL(10, 2);
  v_offer_category TEXT;
  v_partner_id UUID;
  v_stats RECORD;
  v_category_counts JSONB;
  v_partner_counts JSONB;
  v_unique_partners INT;
BEGIN
  -- Only proceed if status changed to PICKED_UP
  IF NEW.status != 'PICKED_UP' OR OLD.status = 'PICKED_UP' THEN
    RETURN NEW;
  END IF;

  -- Get offer details
  SELECT 
    (o.original_price - o.smart_price) * NEW.quantity,
    o.category,
    o.partner_id
  INTO v_money_saved, v_offer_category, v_partner_id
  FROM offers o 
  WHERE o.id = NEW.offer_id;

  -- Get current user stats
  SELECT * INTO v_stats 
  FROM user_stats 
  WHERE user_id = NEW.customer_id;

  IF NOT FOUND THEN
    -- Create user_stats if doesn't exist
    INSERT INTO user_stats (
      user_id, 
      total_reservations, 
      total_money_saved,
      category_counts,
      partner_visit_counts,
      unique_partners_visited
    )
    VALUES (
      NEW.customer_id, 
      1, 
      COALESCE(v_money_saved, 0),
      jsonb_build_object(v_offer_category, 1),
      jsonb_build_object(v_partner_id::text, 1),
      1
    );
  ELSE
    -- Update category counts
    v_category_counts := COALESCE(v_stats.category_counts, '{}'::jsonb);
    IF v_category_counts ? v_offer_category THEN
      v_category_counts := jsonb_set(
        v_category_counts,
        ARRAY[v_offer_category],
        to_jsonb((v_category_counts->>v_offer_category)::int + 1)
      );
    ELSE
      v_category_counts := jsonb_set(
        v_category_counts,
        ARRAY[v_offer_category],
        '1'::jsonb
      );
    END IF;

    -- Update partner visit counts
    v_partner_counts := COALESCE(v_stats.partner_visit_counts, '{}'::jsonb);
    IF v_partner_counts ? v_partner_id::text THEN
      v_partner_counts := jsonb_set(
        v_partner_counts,
        ARRAY[v_partner_id::text],
        to_jsonb((v_partner_counts->>v_partner_id::text)::int + 1)
      );
    ELSE
      v_partner_counts := jsonb_set(
        v_partner_counts,
        ARRAY[v_partner_id::text],
        '1'::jsonb
      );
    END IF;

    -- Count unique partners
    v_unique_partners := (
      SELECT COUNT(DISTINCT key) 
      FROM jsonb_object_keys(v_partner_counts) AS key
    );

    -- Update user_stats
    UPDATE user_stats
    SET total_reservations = total_reservations + 1,
        total_money_saved = total_money_saved + COALESCE(v_money_saved, 0),
        category_counts = v_category_counts,
        partner_visit_counts = v_partner_counts,
        unique_partners_visited = v_unique_partners,
        updated_at = now()
    WHERE user_id = NEW.customer_id;
  END IF;

  -- Check for achievements
  -- First Pick
  IF NOT EXISTS (
    SELECT 1 FROM user_achievements 
    WHERE user_id = NEW.customer_id 
    AND achievement_id = 'ach_first_reservation'
  ) THEN
    INSERT INTO user_achievements (user_id, achievement_id, is_new)
    VALUES (NEW.customer_id, 'ach_first_reservation', true)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Check other reservation-based achievements
  PERFORM check_reservation_achievements(NEW.customer_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check reservation-based achievements
CREATE OR REPLACE FUNCTION check_reservation_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_stats RECORD;
  v_achievement RECORD;
  v_unique_partners INT;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Count unique partners
  v_unique_partners := COALESCE(v_stats.unique_partners_visited, 0);

  -- Check each achievement
  FOR v_achievement IN 
    SELECT * FROM achievement_definitions 
    WHERE is_active = true 
    AND id NOT IN (
      SELECT achievement_id FROM user_achievements WHERE user_id = p_user_id
    )
  LOOP
    -- Reservation count achievements
    IF v_achievement.requirement->>'type' = 'reservations' THEN
      IF v_stats.total_reservations >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new)
        VALUES (p_user_id, v_achievement.id, true)
        ON CONFLICT DO NOTHING;
      END IF;
    
    -- Money saved achievements
    ELSIF v_achievement.requirement->>'type' = 'money_saved' THEN
      IF v_stats.total_money_saved >= (v_achievement.requirement->>'amount')::DECIMAL THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new)
        VALUES (p_user_id, v_achievement.id, true)
        ON CONFLICT DO NOTHING;
      END IF;
    
    -- Unique partners (Explorer, etc.)
    ELSIF v_achievement.requirement->>'type' = 'unique_partners' THEN
      IF v_unique_partners >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id, is_new)
        VALUES (p_user_id, v_achievement.id, true)
        ON CONFLICT DO NOTHING;
      END IF;
    
    -- Category-specific achievements
    ELSIF v_achievement.requirement->>'type' = 'category' THEN
      DECLARE
        v_cat_name TEXT := v_achievement.requirement->>'name';
        v_cat_count INT := COALESCE((v_stats.category_counts->>v_cat_name)::INT, 0);
      BEGIN
        IF v_cat_count >= (v_achievement.requirement->>'count')::INT THEN
          INSERT INTO user_achievements (user_id, achievement_id, is_new)
          VALUES (p_user_id, v_achievement.id, true)
          ON CONFLICT DO NOTHING;
        END IF;
      END;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER update_user_stats_on_pickup_trigger
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_pickup();

COMMIT;

-- Verify
SELECT 'Enhanced trigger created - now tracking unique partners!' as status;
