-- =========================================================
-- FIX EXPIRE FUNCTION TO CREATE SUSPENSION PENALTIES
-- =========================================================
-- When 4th+ missed pickup happens, create actual penalty record
-- =========================================================

CREATE OR REPLACE FUNCTION expire_user_reservations(p_user_id UUID)
RETURNS TABLE(expired_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
  v_missed_pickup_count INTEGER;
  v_suspension_duration INTERVAL;
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
    -- Update warning levels for new missed pickups
    UPDATE user_missed_pickups
    SET warning_level = v_missed_pickup_count
    WHERE user_id = p_user_id
      AND warning_level IS NULL;
    
    -- CREATE SUSPENSION PENALTY if 4th+ missed pickup
    IF v_missed_pickup_count >= 4 THEN
      -- Calculate suspension duration
      v_suspension_duration := CASE
        WHEN v_missed_pickup_count = 4 THEN INTERVAL '1 hour'
        WHEN v_missed_pickup_count = 5 THEN INTERVAL '24 hours'
        ELSE INTERVAL '7 days' -- 6+ = week suspension
      END;
      
      -- Create suspension penalty in user_penalties table
      INSERT INTO user_penalties (
        user_id,
        penalty_type,
        offense_number,
        reason,
        is_active,
        suspended_until,
        created_at
      )
      VALUES (
        p_user_id,
        'SUSPENSION',
        v_missed_pickup_count,
        'Repeated missed pickups - offense #' || v_missed_pickup_count,
        true,
        NOW() + v_suspension_duration,
        NOW()
      )
      ON CONFLICT DO NOTHING; -- Prevent duplicates
      
      RAISE NOTICE '🚫 Created suspension penalty for user % (offense #%)', p_user_id, v_missed_pickup_count;
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION expire_user_reservations(UUID) TO authenticated;

COMMENT ON FUNCTION expire_user_reservations IS 
'Expires ACTIVE reservations, marks as FAILED_PICKUP, tracks missed pickups, creates suspension penalties at 4+';

-- Verify deployment
SELECT 
  'expire_user_reservations' as function_name,
  pg_get_functiondef(oid) LIKE '%user_penalties%' as creates_penalties,
  pg_get_functiondef(oid) LIKE '%SUSPENSION%' as creates_suspensions
FROM pg_proc
WHERE proname = 'expire_user_reservations';
