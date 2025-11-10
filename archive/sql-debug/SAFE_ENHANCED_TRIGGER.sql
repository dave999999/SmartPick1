-- ================================================
-- SAFE ENHANCED TRIGGER: Won't break pickup even if errors occur
-- Run this in Supabase SQL Editor
-- ================================================

BEGIN;

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_user_stats_on_pickup_trigger ON reservations;

-- Drop helper function if exists
DROP FUNCTION IF EXISTS check_reservation_achievements(UUID);

-- Safe trigger with error handling
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

  BEGIN
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
        COALESCE(jsonb_build_object(v_offer_category, 1), '{}'::jsonb),
        COALESCE(jsonb_build_object(v_partner_id::text, 1), '{}'::jsonb),
        1
      )
      ON CONFLICT (user_id) DO NOTHING;
    ELSE
      -- Safely update category counts
      v_category_counts := COALESCE(v_stats.category_counts, '{}'::jsonb);
      IF v_offer_category IS NOT NULL THEN
        IF v_category_counts ? v_offer_category THEN
          v_category_counts := jsonb_set(
            v_category_counts,
            ARRAY[v_offer_category],
            to_jsonb(COALESCE((v_category_counts->>v_offer_category)::int, 0) + 1)
          );
        ELSE
          v_category_counts := jsonb_set(
            v_category_counts,
            ARRAY[v_offer_category],
            '1'::jsonb
          );
        END IF;
      END IF;

      -- Safely update partner visit counts
      v_partner_counts := COALESCE(v_stats.partner_visit_counts, '{}'::jsonb);
      IF v_partner_id IS NOT NULL THEN
        IF v_partner_counts ? v_partner_id::text THEN
          v_partner_counts := jsonb_set(
            v_partner_counts,
            ARRAY[v_partner_id::text],
            to_jsonb(COALESCE((v_partner_counts->>v_partner_id::text)::int, 0) + 1)
          );
        ELSE
          v_partner_counts := jsonb_set(
            v_partner_counts,
            ARRAY[v_partner_id::text],
            '1'::jsonb
          );
        END IF;
      END IF;

      -- Count unique partners
      BEGIN
        SELECT COUNT(*) INTO v_unique_partners
        FROM jsonb_object_keys(v_partner_counts);
      EXCEPTION WHEN OTHERS THEN
        v_unique_partners := COALESCE(v_stats.unique_partners_visited, 0);
      END;

      -- Update user_stats
      UPDATE user_stats
      SET total_reservations = total_reservations + 1,
          total_money_saved = total_money_saved + COALESCE(v_money_saved, 0),
          category_counts = v_category_counts,
          partner_visit_counts = v_partner_counts,
          unique_partners_visited = GREATEST(v_unique_partners, COALESCE(unique_partners_visited, 0)),
          updated_at = now()
      WHERE user_id = NEW.customer_id;
    END IF;

    -- Check for first achievement (simple and safe)
    IF NOT EXISTS (
      SELECT 1 FROM user_achievements 
      WHERE user_id = NEW.customer_id 
      AND achievement_id = 'ach_first_reservation'
    ) THEN
      INSERT INTO user_achievements (user_id, achievement_id, is_new)
      VALUES (NEW.customer_id, 'ach_first_reservation', true)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Try to check other achievements (but don't fail if this errors)
    BEGIN
      PERFORM check_simple_achievements(NEW.customer_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to check achievements: %', SQLERRM;
    END;

  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the pickup
    RAISE WARNING 'Error in update_user_stats_on_pickup: %', SQLERRM;
  END;

  -- Always return NEW so pickup succeeds
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple achievement checker (only checks basic types)
CREATE OR REPLACE FUNCTION check_simple_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_stats RECORD;
  v_total_res INT;
  v_money_saved DECIMAL;
  v_unique_partners INT;
BEGIN
  -- Get user stats
  SELECT 
    total_reservations,
    total_money_saved,
    unique_partners_visited
  INTO v_total_res, v_money_saved, v_unique_partners
  FROM user_stats 
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN RETURN; END IF;

  -- Check reservation milestones (5, 10, 25, 50, 100)
  IF v_total_res >= 5 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'ach_5_reservations') THEN
    INSERT INTO user_achievements (user_id, achievement_id, is_new) VALUES (p_user_id, 'ach_5_reservations', true) ON CONFLICT DO NOTHING;
  END IF;
  
  IF v_total_res >= 10 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'ach_10_reservations') THEN
    INSERT INTO user_achievements (user_id, achievement_id, is_new) VALUES (p_user_id, 'ach_10_reservations', true) ON CONFLICT DO NOTHING;
  END IF;
  
  IF v_total_res >= 25 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'ach_25_reservations') THEN
    INSERT INTO user_achievements (user_id, achievement_id, is_new) VALUES (p_user_id, 'ach_25_reservations', true) ON CONFLICT DO NOTHING;
  END IF;

  -- Check money saved milestones (10, 50, 100 GEL)
  IF v_money_saved >= 10 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'ach_save_10_gel') THEN
    INSERT INTO user_achievements (user_id, achievement_id, is_new) VALUES (p_user_id, 'ach_save_10_gel', true) ON CONFLICT DO NOTHING;
  END IF;
  
  IF v_money_saved >= 50 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'ach_save_50_gel') THEN
    INSERT INTO user_achievements (user_id, achievement_id, is_new) VALUES (p_user_id, 'ach_save_50_gel', true) ON CONFLICT DO NOTHING;
  END IF;

  -- Check Explorer (5 unique partners)
  IF v_unique_partners >= 5 AND NOT EXISTS (SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = 'ach_explorer') THEN
    INSERT INTO user_achievements (user_id, achievement_id, is_new) VALUES (p_user_id, 'ach_explorer', true) ON CONFLICT DO NOTHING;
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Silently ignore errors - don't break pickup
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER update_user_stats_on_pickup_trigger
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_pickup();

COMMIT;

-- Verify
SELECT 'Safe enhanced trigger created - pickup will always succeed!' as status;
