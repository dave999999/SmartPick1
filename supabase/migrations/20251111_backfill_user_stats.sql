-- ============================================
-- BACKFILL USER STATS FROM EXISTING RESERVATIONS
-- Date: 2025-11-11
-- ============================================
-- Recalculates all user stats from picked up reservations
-- Unlocks achievements for users who should have them
-- Run AFTER 20251111_fix_achievement_tracking.sql

BEGIN;

-- ============================================
-- BACKFILL FUNCTION
-- ============================================

DO $$
DECLARE
  v_user RECORD;
  v_total_users INT;
  v_processed INT := 0;
  v_stats_updated INT := 0;
  v_achievements_unlocked INT := 0;
  v_start_time TIMESTAMP := clock_timestamp();
BEGIN
  RAISE NOTICE '🚀 Starting user stats backfill...';
  RAISE NOTICE '📅 Started at: %', v_start_time;

  -- Count total users with pickups
  SELECT COUNT(DISTINCT customer_id)
  INTO v_total_users
  FROM reservations
  WHERE status = 'PICKED_UP';

  RAISE NOTICE '👥 Found % users with picked up reservations', v_total_users;

  -- Loop through all users with picked up reservations
  FOR v_user IN 
    SELECT DISTINCT r.customer_id as user_id
    FROM reservations r
    WHERE r.status = 'PICKED_UP'
    ORDER BY r.customer_id
  LOOP
    v_processed := v_processed + 1;

    -- Log progress every 10 users
    IF v_processed % 10 = 0 THEN
      RAISE NOTICE 'Progress: %/%  (%.1f%%)', 
        v_processed, v_total_users, 
        (v_processed::FLOAT / v_total_users * 100);
    END IF;

    -- Ensure user_stats record exists (for both customers and partners who made reservations)
    INSERT INTO user_stats (user_id)
    VALUES (v_user.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Recalculate ALL stats from reservations
    UPDATE user_stats us
    SET 
      -- Total picked up reservations
      total_reservations = COALESCE((
        SELECT COUNT(*)
        FROM reservations r
        WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
      ), 0),
      
      -- Total money saved
      total_money_saved = COALESCE((
        SELECT SUM((o.original_price - o.smart_price) * r.quantity)
        FROM reservations r
        JOIN offers o ON o.id = r.offer_id
        WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
      ), 0),
      
      -- Category counts (for Early Bird, Night Owl, Sweet Tooth achievements)
      category_counts = COALESCE((
        SELECT jsonb_object_agg(category, count)
        FROM (
          SELECT o.category, COUNT(*)::INT as count
          FROM reservations r
          JOIN offers o ON o.id = r.offer_id
          WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
          GROUP BY o.category
        ) category_stats
      ), '{}'::jsonb),
      
      -- Partner visit counts (for Loyal Customer achievement)
      partner_visit_counts = COALESCE((
        SELECT jsonb_object_agg(partner_id::TEXT, count)
        FROM (
          SELECT o.partner_id, COUNT(*)::INT as count
          FROM reservations r
          JOIN offers o ON o.id = r.offer_id
          WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
          GROUP BY o.partner_id
        ) partner_stats
      ), '{}'::jsonb),
      
      -- Unique partners visited (for Local Hero achievement)
      unique_partners_visited = COALESCE((
        SELECT COUNT(DISTINCT o.partner_id)
        FROM reservations r
        JOIN offers o ON o.id = r.offer_id
        WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
      ), 0),
      
      -- Last activity date
      last_activity_date = COALESCE((
        SELECT MAX(r.picked_up_at::DATE)
        FROM reservations r
        WHERE r.customer_id = v_user.user_id AND r.status = 'PICKED_UP'
      ), CURRENT_DATE),
      
      -- Update timestamp
      updated_at = NOW()
    WHERE us.user_id = v_user.user_id;

    IF FOUND THEN
      v_stats_updated := v_stats_updated + 1;
    END IF;

    -- Trigger achievement checks for this user
    -- This will unlock any achievements they should have
    PERFORM check_user_achievements(v_user.user_id);

    -- Count how many achievements this user has
    v_achievements_unlocked := v_achievements_unlocked + (
      SELECT COUNT(*)
      FROM user_achievements
      WHERE user_id = v_user.user_id
    );
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Backfill complete!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   • Users processed: %', v_processed;
  RAISE NOTICE '   • Stats updated: %', v_stats_updated;
  RAISE NOTICE '   • Achievements unlocked: %', v_achievements_unlocked;
  RAISE NOTICE '   • Duration: % seconds', EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time));
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Check user profiles to see achievements';
  RAISE NOTICE '   2. Pick up a new reservation to test real-time tracking';
  RAISE NOTICE '   3. Verify points were awarded for achievements';

END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show users with most reservations
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🏆 Top 5 users by reservations:';
  FOR v_rec IN
    SELECT 
      u.name,
      us.total_reservations,
      us.total_money_saved,
      (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) as achievements_count
    FROM user_stats us
    JOIN users u ON u.id = us.user_id
    ORDER BY us.total_reservations DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '   • %: % reservations, ₾% saved, % achievements',
      v_rec.name,
      v_rec.total_reservations,
      v_rec.total_money_saved,
      v_rec.achievements_count;
  END LOOP;
END $$;

-- Show achievement unlock stats
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎖️ Most unlocked achievements:';
  FOR v_rec IN
    SELECT 
      ad.name,
      ad.icon,
      COUNT(*) as unlock_count
    FROM user_achievements ua
    JOIN achievement_definitions ad ON ad.id = ua.achievement_id
    GROUP BY ad.name, ad.icon
    ORDER BY unlock_count DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '   • % %: unlocked by % users',
      v_rec.icon,
      v_rec.name,
      v_rec.unlock_count;
  END LOOP;
END $$;
