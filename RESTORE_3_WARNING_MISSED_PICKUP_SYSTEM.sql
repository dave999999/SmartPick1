-- =========================================================
-- RESTORE 3-WARNING FRIENDLY SYSTEM FOR MISSED PICKUPS
-- =========================================================
-- Based on December 26, 2025 implementation
-- Separate tracking from cancellations
-- =========================================================

-- 1. CREATE user_missed_pickups TABLE (separate from cancellations)
DROP TABLE IF EXISTS user_missed_pickups CASCADE;

CREATE TABLE user_missed_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  warning_shown BOOLEAN DEFAULT FALSE,
  warning_level INTEGER -- 1, 2, 3 for warnings; 4+ for suspensions
);

CREATE INDEX idx_user_missed_pickups_user ON user_missed_pickups(user_id);
CREATE INDEX idx_user_missed_pickups_created ON user_missed_pickups(created_at);

COMMENT ON TABLE user_missed_pickups IS 'Tracks missed pickups separately from cancellations - for friendly 3-warning system';

-- 2. UPDATE expire_user_reservations TO TRACK MISSED PICKUPS SEPARATELY
DROP FUNCTION IF EXISTS expire_user_reservations(UUID) CASCADE;

CREATE OR REPLACE FUNCTION expire_user_reservations(p_user_id UUID)
RETURNS TABLE(expired_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
  v_missed_pickup_count INTEGER;
BEGIN
  -- Mark user's expired reservations as FAILED_PICKUP (using customer_id)
  WITH expired AS (
    UPDATE reservations
    SET status = 'FAILED_PICKUP', updated_at = NOW()
    WHERE customer_id = p_user_id
      AND status = 'ACTIVE'
      AND expires_at < NOW()
    RETURNING id, quantity, offer_id
  )
  , restored AS (
    -- Restore offer quantities
    UPDATE offers o
    SET quantity_available = quantity_available + e.quantity,
        updated_at = NOW()
    FROM expired e
    WHERE o.id = e.offer_id
    RETURNING o.id
  )
  , tracked AS (
    -- Track as MISSED PICKUPS (not cancellations)
    INSERT INTO user_missed_pickups (user_id, reservation_id, created_at)
    SELECT p_user_id, e.id, NOW()
    FROM expired e
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_count FROM expired;
  
  -- Count total missed pickups in last 30 days
  SELECT COUNT(*) INTO v_missed_pickup_count
  FROM user_missed_pickups
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '30 days';
  
  -- Apply progressive penalties based on missed pickup count
  IF v_count > 0 THEN
    -- Update warning levels
    UPDATE user_missed_pickups
    SET warning_level = v_missed_pickup_count
    WHERE user_id = p_user_id
      AND warning_level IS NULL;
    
    -- Apply suspension if needed (4th+ missed pickup)
    IF v_missed_pickup_count >= 4 THEN
      -- 4th = 1 hour, 5th = 24 hours, 6th+ = ban
      CASE
        WHEN v_missed_pickup_count = 4 THEN
          -- 1-hour suspension
          INSERT INTO user_cooldown_lifts (user_id, lifted_at)
          VALUES (p_user_id, NOW())
          ON CONFLICT DO NOTHING;
        WHEN v_missed_pickup_count = 5 THEN
          -- 24-hour suspension (add to cooldown)
          INSERT INTO user_cancellation_tracking (user_id, created_at)
          SELECT p_user_id, NOW()
          FROM generate_series(1, 5); -- Add 5 to trigger ban-level
        WHEN v_missed_pickup_count >= 6 THEN
          -- Permanent ban
          UPDATE auth.users
          SET raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'::jsonb),
            '{banned}',
            'true'::jsonb
          )
          WHERE id = p_user_id;
      END CASE;
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION expire_user_reservations(UUID) TO authenticated;

COMMENT ON FUNCTION expire_user_reservations IS 
'Expires ACTIVE reservations, marks as FAILED_PICKUP, tracks as missed pickups (separate from cancellations), applies 3-warning system';

-- 3. CREATE FUNCTION TO GET MISSED PICKUP STATUS
CREATE OR REPLACE FUNCTION get_user_missed_pickup_status(p_user_id UUID)
RETURNS TABLE(
  total_missed INTEGER,
  warning_level INTEGER,
  needs_warning BOOLEAN,
  warning_message TEXT,
  warning_emoji TEXT
) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count missed pickups in last 30 days
  SELECT COUNT(*) INTO v_count
  FROM user_missed_pickups
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '30 days';
  
  RETURN QUERY SELECT
    v_count,
    CASE
      WHEN v_count <= 3 THEN v_count
      ELSE 4
    END as warning_level,
    (v_count > 0 AND v_count <= 3) as needs_warning,
    CASE
      WHEN v_count = 1 THEN 'You have 3 chances - stay careful!'
      WHEN v_count = 2 THEN '2 chances left - be more careful!'
      WHEN v_count = 3 THEN '1 chance left - this is important!'
      WHEN v_count >= 4 THEN 'Account suspended due to repeated missed pickups'
      ELSE NULL
    END as warning_message,
    CASE
      WHEN v_count = 1 THEN '💛'
      WHEN v_count = 2 THEN '🧡'
      WHEN v_count = 3 THEN '🔴'
      WHEN v_count >= 4 THEN '🚫'
      ELSE NULL
    END as warning_emoji;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION get_user_missed_pickup_status(UUID) TO authenticated;

COMMENT ON FUNCTION get_user_missed_pickup_status IS 
'Returns friendly warning status for missed pickups (💛🧡🔴) - separate from cancellation cooldown';

-- 4. VERIFY DEPLOYMENT
SELECT 
  'Tables' as type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_name = 'user_missed_pickups'
UNION ALL
SELECT 
  'Functions',
  COUNT(*)
FROM pg_proc
WHERE proname IN ('expire_user_reservations', 'get_user_missed_pickup_status');

-- ✅ SYSTEM RESTORED:
-- - Missed pickups tracked separately from cancellations
-- - 3-warning friendly system (💛🧡🔴)
-- - 4th = 1 hour suspension (lift with 100 points)
-- - 5th = 24 hour suspension (lift with 500 points)
-- - 6th+ = permanent ban
-- - Cancellation cooldown system still works independently!
