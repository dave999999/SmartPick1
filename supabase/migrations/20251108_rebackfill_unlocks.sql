-- Force refresh/unlock achievements for all existing users
-- Safe to run multiple times

-- 1) Ensure all achievements are active
UPDATE achievement_definitions
SET is_active = true
WHERE is_active IS DISTINCT FROM true;

-- 2) Recompute category & partner stats just in case (idempotent)
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT user_id FROM user_stats LOOP
    -- Recalculate category counts
    UPDATE user_stats us
    SET category_counts = (
      SELECT COALESCE(jsonb_object_agg(category, count), '{}'::jsonb)
      FROM (
        SELECT o.category, COUNT(*)::INT as count
        FROM reservations r
        JOIN offers o ON o.id = r.offer_id
        WHERE r.user_id = v_user.user_id
        GROUP BY o.category
      ) s
    )
    WHERE us.user_id = v_user.user_id;

    -- Recalculate partner visit counts and unique partners
    UPDATE user_stats us
    SET partner_visit_counts = (
          SELECT COALESCE(jsonb_object_agg(partner_id::TEXT, count), '{}'::jsonb)
          FROM (
            SELECT o.partner_id, COUNT(*)::INT as count
            FROM reservations r
            JOIN offers o ON o.id = r.offer_id
            WHERE r.user_id = v_user.user_id
            GROUP BY o.partner_id
          ) s
        ),
        unique_partners_visited = (
          SELECT COALESCE(COUNT(DISTINCT o.partner_id), 0)
          FROM reservations r
          JOIN offers o ON o.id = r.offer_id
          WHERE r.user_id = v_user.user_id
        )
    WHERE us.user_id = v_user.user_id;

    -- Re-run achievement checks (no auto-award; claim flow handles rewards)
    PERFORM check_user_achievements(v_user.user_id);
  END LOOP;
END $$;
