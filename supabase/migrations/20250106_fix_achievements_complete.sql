-- ================================================================
-- ACHIEVEMENT SYSTEM COMPLETE FIX
-- ================================================================
-- This migration:
-- 1. Adds category and partner tracking columns to user_stats
-- 2. Updates the reservation trigger to track these new fields
-- 3. Fixes check_user_achievements to handle ALL achievement types
-- ================================================================

-- STEP 1: Add tracking columns to user_stats
ALTER TABLE user_stats
  ADD COLUMN IF NOT EXISTS category_counts JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unique_partners_visited INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partner_visit_counts JSONB DEFAULT '{}'::jsonb;

-- STEP 2: Update the reservation stats trigger
CREATE OR REPLACE FUNCTION update_user_stats_on_reservation()
RETURNS TRIGGER AS $$
DECLARE
  v_offer_price DECIMAL;
  v_offer_category TEXT;
  v_partner_id UUID;
  v_current_category_count INTEGER;
  v_current_partner_count INTEGER;
BEGIN
  -- Get offer details (price, category, partner)
  SELECT o.original_price, o.category, o.partner_id
  INTO v_offer_price, v_offer_category, v_partner_id
  FROM offers o
  WHERE o.id = NEW.offer_id;

  -- Update basic stats
  UPDATE user_stats
  SET 
    total_reservations = total_reservations + 1,
    total_money_saved = total_money_saved + COALESCE(v_offer_price, 0),
    last_activity_at = NOW(),
    
    -- Update category counts
    category_counts = jsonb_set(
      category_counts,
      ARRAY[v_offer_category],
      to_jsonb(COALESCE((category_counts->>v_offer_category)::INTEGER, 0) + 1)
    ),
    
    -- Update partner visit counts
    partner_visit_counts = jsonb_set(
      partner_visit_counts,
      ARRAY[v_partner_id::TEXT],
      to_jsonb(COALESCE((partner_visit_counts->>v_partner_id::TEXT)::INTEGER, 0) + 1)
    ),
    
    -- Update unique partners count
    unique_partners_visited = (
      SELECT COUNT(DISTINCT key)
      FROM jsonb_object_keys(
        jsonb_set(
          partner_visit_counts,
          ARRAY[v_partner_id::TEXT],
          to_jsonb(COALESCE((partner_visit_counts->>v_partner_id::TEXT)::INTEGER, 0) + 1)
        )
      ) AS key
    )
  WHERE user_id = NEW.user_id;

  -- Check for new achievements
  PERFORM check_user_achievements(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 3: Complete achievement check function with ALL types
CREATE OR REPLACE FUNCTION check_user_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_achievement RECORD;
  v_stats RECORD;
  v_already_has BOOLEAN;
  v_requirement_type TEXT;
  v_category_name TEXT;
  v_category_count INTEGER;
  v_partner_id TEXT;
  v_max_partner_visits INTEGER;
BEGIN
  -- Get user stats
  SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Loop through all active achievements
  FOR v_achievement IN
    SELECT * FROM achievement_definitions WHERE is_active = true
  LOOP
    -- Check if user already has this achievement
    SELECT EXISTS(
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) INTO v_already_has;

    IF v_already_has THEN
      CONTINUE;
    END IF;

    v_requirement_type := v_achievement.requirement->>'type';

    -- TYPE 1: Reservations (total count)
    IF v_requirement_type = 'reservations' THEN
      IF v_stats.total_reservations >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id);

        IF v_achievement.reward_points > 0 THEN
          PERFORM add_user_points(
            p_user_id,
            v_achievement.reward_points,
            'achievement',
            jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
          );
        END IF;
      END IF;

    -- TYPE 2: Money saved (total amount)
    ELSIF v_requirement_type = 'money_saved' THEN
      IF v_stats.total_money_saved >= (v_achievement.requirement->>'amount')::DECIMAL THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id);

        IF v_achievement.reward_points > 0 THEN
          PERFORM add_user_points(
            p_user_id,
            v_achievement.reward_points,
            'achievement',
            jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
          );
        END IF;
      END IF;

    -- TYPE 3: Category-specific reservations
    ELSIF v_requirement_type = 'category' THEN
      v_category_name := v_achievement.requirement->>'name';
      v_category_count := COALESCE((v_stats.category_counts->>v_category_name)::INT, 0);

      IF v_category_count >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id);

        IF v_achievement.reward_points > 0 THEN
          PERFORM add_user_points(
            p_user_id,
            v_achievement.reward_points,
            'achievement',
            jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
          );
        END IF;
      END IF;

    -- TYPE 4: Unique partners visited
    ELSIF v_requirement_type = 'unique_partners' THEN
      IF v_stats.unique_partners_visited >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id);

        IF v_achievement.reward_points > 0 THEN
          PERFORM add_user_points(
            p_user_id,
            v_achievement.reward_points,
            'achievement',
            jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
          );
        END IF;
      END IF;

    -- TYPE 5: Partner loyalty (max visits to single partner)
    ELSIF v_requirement_type = 'partner_loyalty' THEN
      -- Find the max visit count across all partners
      SELECT MAX((value)::INT)
      INTO v_max_partner_visits
      FROM jsonb_each_text(v_stats.partner_visit_counts);

      IF COALESCE(v_max_partner_visits, 0) >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id);

        IF v_achievement.reward_points > 0 THEN
          PERFORM add_user_points(
            p_user_id,
            v_achievement.reward_points,
            'achievement',
            jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
          );
        END IF;
      END IF;

    -- TYPE 6: Streak (consecutive days)
    ELSIF v_requirement_type = 'streak' THEN
      IF v_stats.current_streak_days >= (v_achievement.requirement->>'days')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id);

        IF v_achievement.reward_points > 0 THEN
          PERFORM add_user_points(
            p_user_id,
            v_achievement.reward_points,
            'achievement',
            jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
          );
        END IF;
      END IF;

    -- TYPE 7: Referrals (total count)
    ELSIF v_requirement_type = 'referrals' THEN
      IF v_stats.total_referrals >= (v_achievement.requirement->>'count')::INT THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_achievement.id);

        IF v_achievement.reward_points > 0 THEN
          PERFORM add_user_points(
            p_user_id,
            v_achievement.reward_points,
            'achievement',
            jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Backfill existing user data
-- Update category and partner counts from existing reservations
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT DISTINCT user_id FROM reservations
  LOOP
    -- Recalculate category counts
    UPDATE user_stats us
    SET category_counts = (
      SELECT jsonb_object_agg(category, count)
      FROM (
        SELECT o.category, COUNT(*)::INT as count
        FROM reservations r
        JOIN offers o ON o.id = r.offer_id
        WHERE r.user_id = v_user.user_id
        GROUP BY o.category
      ) category_stats
    )
    WHERE us.user_id = v_user.user_id;

    -- Recalculate partner visit counts
    UPDATE user_stats us
    SET 
      partner_visit_counts = (
        SELECT jsonb_object_agg(partner_id::TEXT, count)
        FROM (
          SELECT o.partner_id, COUNT(*)::INT as count
          FROM reservations r
          JOIN offers o ON o.id = r.offer_id
          WHERE r.user_id = v_user.user_id
          GROUP BY o.partner_id
        ) partner_stats
      ),
      unique_partners_visited = (
        SELECT COUNT(DISTINCT o.partner_id)
        FROM reservations r
        JOIN offers o ON o.id = r.offer_id
        WHERE r.user_id = v_user.user_id
      )
    WHERE us.user_id = v_user.user_id;

    -- Trigger achievement check for this user
    PERFORM check_user_achievements(v_user.user_id);
  END LOOP;
END $$;

-- STEP 5: Grant permissions
GRANT EXECUTE ON FUNCTION update_user_stats_on_reservation TO service_role;
GRANT EXECUTE ON FUNCTION check_user_achievements TO service_role;

-- Done! All achievements should now unlock properly.
