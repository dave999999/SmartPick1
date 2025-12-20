-- =====================================================
-- COMPLETE PENALTY SYSTEM FIX
-- Implements automatic penalties for cancellations and failed pickups
-- =====================================================

BEGIN;

-- ============================================
-- PART 1: Fix Cancellation Penalty Enforcement
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS apply_cancellation_penalty() CASCADE;

-- Create function to automatically apply penalties based on cancellation count
CREATE OR REPLACE FUNCTION apply_cancellation_penalty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cancel_count INT;
  v_user_status TEXT;
  v_partner_id UUID;
  v_penalty_id UUID;
BEGIN
  -- Count cancellations in last 30 days
  SELECT COUNT(*) INTO v_cancel_count
  FROM user_cancellation_tracking
  WHERE user_id = NEW.user_id
    AND cancelled_at > NOW() - INTERVAL '30 days';
  
  -- Get user status
  SELECT status INTO v_user_status
  FROM users
  WHERE id = NEW.user_id;
  
  -- Get partner_id from reservation if available
  SELECT partner_id INTO v_partner_id
  FROM reservations
  WHERE id = NEW.reservation_id
  LIMIT 1;
  
  -- Apply progressive penalties
  IF v_cancel_count = 2 AND v_user_status != 'BANNED' THEN
    -- 2nd cancellation = 1-hour suspension
    INSERT INTO user_penalties (
      user_id,
      reservation_id,
      partner_id,
      offense_number,
      offense_type,
      penalty_type,
      suspended_until,
      is_active,
      can_lift_with_points,
      points_required
    ) VALUES (
      NEW.user_id,
      NEW.reservation_id,
      v_partner_id,
      2,
      'late_cancellation',
      '1hour',
      NOW() + INTERVAL '1 hour',
      true,
      true,
      100
    )
    RETURNING id INTO v_penalty_id;
    
    -- Update user status
    UPDATE users
    SET is_suspended = true,
        suspended_until = NOW() + INTERVAL '1 hour',
        current_penalty_level = 2,
        total_missed_pickups = total_missed_pickups + 1,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'Applied 1-hour suspension to user % for 2nd cancellation', NEW.user_id;
    
  ELSIF v_cancel_count = 3 AND v_user_status != 'BANNED' THEN
    -- 3rd cancellation = 24-hour ban
    INSERT INTO user_penalties (
      user_id,
      reservation_id,
      partner_id,
      offense_number,
      offense_type,
      penalty_type,
      suspended_until,
      is_active,
      can_lift_with_points,
      points_required
    ) VALUES (
      NEW.user_id,
      NEW.reservation_id,
      v_partner_id,
      3,
      'late_cancellation',
      '24hour',
      NOW() + INTERVAL '24 hours',
      true,
      true,
      500
    )
    RETURNING id INTO v_penalty_id;
    
    UPDATE users
    SET is_suspended = true,
        suspended_until = NOW() + INTERVAL '24 hours',
        current_penalty_level = 3,
        total_missed_pickups = total_missed_pickups + 1,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'Applied 24-hour ban to user % for 3rd cancellation', NEW.user_id;
    
  ELSIF v_cancel_count >= 4 AND v_user_status != 'BANNED' THEN
    -- 4th+ cancellation = permanent ban
    INSERT INTO user_penalties (
      user_id,
      reservation_id,
      partner_id,
      offense_number,
      offense_type,
      penalty_type,
      suspended_until,
      is_active,
      can_lift_with_points,
      points_required
    ) VALUES (
      NEW.user_id,
      NEW.reservation_id,
      v_partner_id,
      4,
      'late_cancellation',
      'permanent',
      NULL,
      true,
      false,
      0
    )
    RETURNING id INTO v_penalty_id;
    
    UPDATE users
    SET status = 'BANNED',
        is_suspended = true,
        suspended_until = NULL,
        current_penalty_level = 4,
        total_missed_pickups = total_missed_pickups + 1,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'Applied PERMANENT BAN to user % for 4th+ cancellation', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to apply cancellation penalties
DROP TRIGGER IF EXISTS trg_apply_cancellation_penalty ON user_cancellation_tracking;
CREATE TRIGGER trg_apply_cancellation_penalty
AFTER INSERT ON user_cancellation_tracking
FOR EACH ROW
EXECUTE FUNCTION apply_cancellation_penalty();

COMMENT ON FUNCTION apply_cancellation_penalty IS 'Automatically applies progressive penalties: 1hr (2nd), 24hr (3rd), permanent (4th+)';

-- ============================================
-- PART 2: Implement Failed Pickup (No-Show) System
-- ============================================

-- Create function for partner to mark no-show
DROP FUNCTION IF EXISTS partner_mark_no_show(UUID) CASCADE;

CREATE OR REPLACE FUNCTION partner_mark_no_show(p_reservation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
  v_reservation RECORD;
  v_current_user_id UUID;
  v_failed_pickup_count INT;
  v_user_status TEXT;
  v_penalty_id UUID;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;
  
  -- Get current user's partner ID
  SELECT p.id INTO v_partner_id 
  FROM partners p
  WHERE p.user_id = v_current_user_id;
  
  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User is not a partner');
  END IF;

  -- Get the reservation and verify ownership
  SELECT * INTO v_reservation
  FROM reservations r
  WHERE r.id = p_reservation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Reservation not found');
  END IF;
  
  -- Verify partner owns this reservation
  IF v_reservation.partner_id != v_partner_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Access denied');
  END IF;
  
  -- Check if status is ACTIVE or EXPIRED
  IF v_reservation.status NOT IN ('ACTIVE', 'EXPIRED') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Can only mark ACTIVE or EXPIRED reservations as no-show');
  END IF;

  -- Mark as FAILED_PICKUP
  UPDATE reservations
  SET 
    status = 'FAILED_PICKUP',
    penalty_applied = true,
    updated_at = NOW()
  WHERE id = p_reservation_id;

  -- Restore offer quantity
  UPDATE offers
  SET quantity_available = quantity_available + v_reservation.quantity,
      updated_at = NOW()
  WHERE id = v_reservation.offer_id;

  -- Count failed pickups in last 30 days
  SELECT COUNT(*) INTO v_failed_pickup_count
  FROM reservations
  WHERE customer_id = v_reservation.customer_id
    AND status = 'FAILED_PICKUP'
    AND created_at > NOW() - INTERVAL '30 days';

  -- Get user status
  SELECT status INTO v_user_status
  FROM users
  WHERE id = v_reservation.customer_id;

  -- Apply progressive penalties
  IF v_failed_pickup_count = 1 AND v_user_status != 'BANNED' THEN
    -- 1st failed pickup = Warning
    INSERT INTO user_penalties (
      user_id,
      reservation_id,
      partner_id,
      offense_number,
      offense_type,
      penalty_type,
      is_active,
      can_lift_with_points,
      points_required
    ) VALUES (
      v_reservation.customer_id,
      p_reservation_id,
      v_partner_id,
      1,
      'missed_pickup',
      'warning',
      true,
      false,
      0
    )
    RETURNING id INTO v_penalty_id;
    
    UPDATE users
    SET current_penalty_level = 1,
        total_missed_pickups = total_missed_pickups + 1,
        updated_at = NOW()
    WHERE id = v_reservation.customer_id;
    
  ELSIF v_failed_pickup_count = 2 AND v_user_status != 'BANNED' THEN
    -- 2nd failed pickup = 1-hour suspension
    INSERT INTO user_penalties (
      user_id,
      reservation_id,
      partner_id,
      offense_number,
      offense_type,
      penalty_type,
      suspended_until,
      is_active,
      can_lift_with_points,
      points_required
    ) VALUES (
      v_reservation.customer_id,
      p_reservation_id,
      v_partner_id,
      2,
      'missed_pickup',
      '1hour',
      NOW() + INTERVAL '1 hour',
      true,
      true,
      100
    )
    RETURNING id INTO v_penalty_id;
    
    UPDATE users
    SET is_suspended = true,
        suspended_until = NOW() + INTERVAL '1 hour',
        current_penalty_level = 2,
        total_missed_pickups = total_missed_pickups + 1,
        updated_at = NOW()
    WHERE id = v_reservation.customer_id;
    
  ELSIF v_failed_pickup_count = 3 AND v_user_status != 'BANNED' THEN
    -- 3rd failed pickup = 24-hour ban
    INSERT INTO user_penalties (
      user_id,
      reservation_id,
      partner_id,
      offense_number,
      offense_type,
      penalty_type,
      suspended_until,
      is_active,
      can_lift_with_points,
      points_required
    ) VALUES (
      v_reservation.customer_id,
      p_reservation_id,
      v_partner_id,
      3,
      'missed_pickup',
      '24hour',
      NOW() + INTERVAL '24 hours',
      true,
      true,
      500
    )
    RETURNING id INTO v_penalty_id;
    
    UPDATE users
    SET is_suspended = true,
        suspended_until = NOW() + INTERVAL '24 hours',
        current_penalty_level = 3,
        total_missed_pickups = total_missed_pickups + 1,
        updated_at = NOW()
    WHERE id = v_reservation.customer_id;
    
  ELSIF v_failed_pickup_count >= 4 AND v_user_status != 'BANNED' THEN
    -- 4th+ failed pickup = permanent ban
    INSERT INTO user_penalties (
      user_id,
      reservation_id,
      partner_id,
      offense_number,
      offense_type,
      penalty_type,
      is_active,
      can_lift_with_points,
      points_required
    ) VALUES (
      v_reservation.customer_id,
      p_reservation_id,
      v_partner_id,
      4,
      'missed_pickup',
      'permanent',
      true,
      false,
      0
    )
    RETURNING id INTO v_penalty_id;
    
    UPDATE users
    SET status = 'BANNED',
        is_suspended = true,
        current_penalty_level = 4,
        total_missed_pickups = total_missed_pickups + 1,
        updated_at = NOW()
    WHERE id = v_reservation.customer_id;
  END IF;

  -- Update reservation with penalty_id if created
  IF v_penalty_id IS NOT NULL THEN
    UPDATE reservations
    SET penalty_id = v_penalty_id
    WHERE id = p_reservation_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Marked as no-show and penalty applied',
    'failed_pickup_count', v_failed_pickup_count,
    'penalty_level', COALESCE(v_failed_pickup_count, 0),
    'penalty_id', v_penalty_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION partner_mark_no_show TO authenticated;

COMMENT ON FUNCTION partner_mark_no_show IS 'Partner marks customer no-show, applies progressive penalties: Warning (1st), 1hr (2nd), 24hr (3rd), permanent (4th+)';

-- ============================================
-- PART 3: Update can_user_reserve to check cooldown
-- ============================================

DROP FUNCTION IF EXISTS can_user_reserve(UUID) CASCADE;

CREATE OR REPLACE FUNCTION can_user_reserve(p_user_id UUID)
RETURNS TABLE (
  can_reserve BOOLEAN,
  reason TEXT,
  suspended_until TIMESTAMPTZ,
  penalty_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_status TEXT;
  v_is_suspended BOOLEAN;
  v_suspended_until TIMESTAMPTZ;
  v_active_penalty RECORD;
  v_in_cooldown BOOLEAN;
  v_cancel_count INT;
BEGIN
  -- Check user status
  SELECT status, is_suspended, users.suspended_until
  INTO v_user_status, v_is_suspended, v_suspended_until
  FROM users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'User not found', NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if banned
  IF v_user_status = 'BANNED' THEN
    RETURN QUERY SELECT false, 'Account is permanently banned', NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check active penalty
  SELECT * INTO v_active_penalty
  FROM user_penalties
  WHERE user_id = p_user_id 
    AND is_active = true
    AND (suspended_until IS NULL OR suspended_until > NOW())
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    IF v_active_penalty.penalty_type = 'permanent' THEN
      RETURN QUERY SELECT false, 'You have a permanent ban. Contact support.', NULL::TIMESTAMPTZ, v_active_penalty.id;
      RETURN;
    ELSIF v_active_penalty.suspended_until IS NOT NULL AND v_active_penalty.suspended_until > NOW() THEN
      RETURN QUERY SELECT 
        false, 
        'You are suspended until ' || to_char(v_active_penalty.suspended_until, 'HH24:MI') || '. Reason: ' || v_active_penalty.offense_type,
        v_active_penalty.suspended_until,
        v_active_penalty.id;
      RETURN;
    ELSE
      -- Penalty expired, deactivate it
      UPDATE user_penalties
      SET is_active = false, updated_at = NOW()
      WHERE id = v_active_penalty.id;
    END IF;
  END IF;
  
  -- Check cancellation cooldown (3 cancellations in 30 minutes)
  SELECT in_cooldown INTO v_in_cooldown
  FROM is_user_in_cooldown(p_user_id);
  
  IF v_in_cooldown THEN
    SELECT COUNT(*) INTO v_cancel_count
    FROM user_cancellation_tracking
    WHERE user_id = p_user_id
      AND cancelled_at > NOW() - INTERVAL '30 minutes';
      
    RETURN QUERY SELECT 
      false,
      'Too many cancellations (' || v_cancel_count || '). Please wait 30 minutes.',
      (SELECT MIN(cancelled_at) + INTERVAL '30 minutes' 
       FROM user_cancellation_tracking 
       WHERE user_id = p_user_id 
         AND cancelled_at > NOW() - INTERVAL '30 minutes'),
      NULL::UUID;
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::UUID;
END;
$$;

GRANT EXECUTE ON FUNCTION can_user_reserve TO authenticated;

COMMENT ON FUNCTION can_user_reserve IS 'Checks if user can reserve: status, penalties, and cancellation cooldown';

-- ============================================
-- PART 4: Auto-expire old penalties
-- ============================================

CREATE OR REPLACE FUNCTION auto_deactivate_expired_penalties()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deactivate penalties that have expired
  UPDATE user_penalties
  SET is_active = false, updated_at = NOW()
  WHERE is_active = true
    AND penalty_type != 'permanent'
    AND suspended_until IS NOT NULL
    AND suspended_until <= NOW();
    
  -- Update user suspension status
  UPDATE users
  SET is_suspended = false,
      suspended_until = NULL,
      updated_at = NOW()
  WHERE is_suspended = true
    AND suspended_until IS NOT NULL
    AND suspended_until <= NOW();
END;
$$;

COMMENT ON FUNCTION auto_deactivate_expired_penalties IS 'Deactivates expired penalties and updates user status';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 
  '✅ Complete Penalty System Installed!' as status,
  'Cancellation penalties, failed pickup tracking, and cooldown checks active' as message;

COMMIT;
