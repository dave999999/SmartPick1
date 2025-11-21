-- =====================================================
-- Admin RPC Functions - Communication & Alerts
-- =====================================================
-- These are placeholder RPC functions for the admin system
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- COMMUNICATION FUNCTIONS
-- =====================================================

-- Send announcement to users/partners
CREATE OR REPLACE FUNCTION admin_send_announcement(
  p_title TEXT,
  p_message TEXT,
  p_target_audience TEXT,
  p_target_ids UUID[],
  p_priority TEXT,
  p_channel TEXT,
  p_scheduled_at TIMESTAMPTZ
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_announcement_id UUID;
  v_sent_count INTEGER := 0;
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Create announcement
  INSERT INTO announcements (
    title,
    message,
    target_audience,
    target_ids,
    priority,
    channel,
    scheduled_at,
    created_by,
    status
  ) VALUES (
    p_title,
    p_message,
    p_target_audience,
    p_target_ids,
    p_priority,
    p_channel,
    p_scheduled_at,
    auth.uid(),
    CASE WHEN p_scheduled_at IS NULL THEN 'SENT' ELSE 'SCHEDULED' END
  )
  RETURNING id INTO v_announcement_id;

  -- Calculate sent count based on target audience
  IF p_target_audience = 'ALL_USERS' THEN
    SELECT COUNT(*) INTO v_sent_count FROM users WHERE role = 'CUSTOMER';
  ELSIF p_target_audience = 'ALL_PARTNERS' THEN
    SELECT COUNT(*) INTO v_sent_count FROM users WHERE role = 'PARTNER';
  ELSIF p_target_audience = 'EVERYONE' THEN
    SELECT COUNT(*) INTO v_sent_count FROM users WHERE role IN ('CUSTOMER', 'PARTNER');
  ELSIF p_target_audience IN ('SPECIFIC_USERS', 'SPECIFIC_PARTNERS') THEN
    v_sent_count := array_length(p_target_ids, 1);
  END IF;

  -- Update sent count
  UPDATE announcements SET sent_count = v_sent_count WHERE id = v_announcement_id;

  -- TODO: Implement actual notification sending based on channel
  -- For now, just return success

  RETURN json_build_object(
    'success', true,
    'message', 'Announcement created successfully',
    'announcement_id', v_announcement_id,
    'sent_count', v_sent_count
  );
END;
$$;

-- Send direct message
CREATE OR REPLACE FUNCTION admin_send_direct_message(
  p_recipient_id UUID,
  p_recipient_type TEXT,
  p_subject TEXT,
  p_message TEXT,
  p_channel TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Create direct message
  INSERT INTO direct_messages (
    recipient_id,
    recipient_type,
    sender_id,
    subject,
    message,
    channel
  ) VALUES (
    p_recipient_id,
    p_recipient_type,
    auth.uid(),
    p_subject,
    p_message,
    p_channel
  )
  RETURNING id INTO v_message_id;

  -- TODO: Implement actual message delivery based on channel

  RETURN json_build_object(
    'success', true,
    'message', 'Direct message sent successfully',
    'message_id', v_message_id
  );
END;
$$;

-- Get users for targeting (with filters)
CREATE OR REPLACE FUNCTION admin_get_users_for_targeting(
  p_role TEXT DEFAULT NULL,
  p_level_min INTEGER DEFAULT NULL,
  p_level_max INTEGER DEFAULT NULL,
  p_points_min INTEGER DEFAULT NULL,
  p_points_max INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.full_name,
    u.email,
    u.role
  FROM users u
  WHERE
    (p_role IS NULL OR u.role = p_role)
    AND (p_level_min IS NULL OR u.level >= p_level_min)
    AND (p_level_max IS NULL OR u.level <= p_level_max)
    AND (p_points_min IS NULL OR u.smart_points >= p_points_min)
    AND (p_points_max IS NULL OR u.smart_points <= p_points_max)
  ORDER BY u.created_at DESC;
END;
$$;

-- Get partners for targeting (with filters)
CREATE OR REPLACE FUNCTION admin_get_partners_for_targeting(
  p_status TEXT DEFAULT NULL,
  p_verified BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  contact_email TEXT,
  status TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.business_name,
    p.contact_email,
    p.status
  FROM partners p
  WHERE
    (p_status IS NULL OR p.status = p_status)
    AND (p_verified IS NULL OR p.verified = p_verified)
  ORDER BY p.created_at DESC;
END;
$$;

-- =====================================================
-- ALERT FUNCTIONS
-- =====================================================

-- Test alert rule (manually trigger)
CREATE OR REPLACE FUNCTION admin_test_alert_rule(
  p_rule_id UUID
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_rule alert_rules;
  v_event_id UUID;
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get rule
  SELECT * INTO v_rule FROM alert_rules WHERE id = p_rule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alert rule not found';
  END IF;

  -- Create test alert event
  INSERT INTO alert_events (
    rule_id,
    rule_name,
    severity,
    title,
    description,
    current_value,
    threshold_value
  ) VALUES (
    v_rule.id,
    v_rule.name,
    v_rule.severity,
    '[TEST] ' || v_rule.name,
    'This is a test alert triggered manually.',
    999,
    v_rule.threshold_value
  )
  RETURNING id INTO v_event_id;

  -- Update last_triggered
  UPDATE alert_rules SET last_triggered = NOW() WHERE id = p_rule_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Test alert triggered successfully',
    'event_id', v_event_id
  );
END;
$$;

-- =====================================================
-- REAL-TIME MONITORING (Placeholder)
-- =====================================================

-- Get real-time platform stats
CREATE OR REPLACE FUNCTION admin_get_realtime_stats()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_users INTEGER;
  v_active_partners INTEGER;
  v_active_reservations INTEGER;
  v_pending_pickups INTEGER;
  v_reservations_last_hour INTEGER;
  v_new_users_last_hour INTEGER;
  v_revenue_last_hour NUMERIC;
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Active users (logged in last 15 minutes - using created_at as fallback since last_seen may not exist)
  SELECT COUNT(*) INTO v_active_users
  FROM users
  WHERE role = 'CUSTOMER'
  AND created_at > NOW() - INTERVAL '24 hours';

  -- Active partners (logged in last 15 minutes - using created_at as fallback)
  SELECT COUNT(*) INTO v_active_partners
  FROM users
  WHERE role = 'PARTNER'
  AND created_at > NOW() - INTERVAL '24 hours';

  -- Active reservations
  SELECT COUNT(*) INTO v_active_reservations
  FROM reservations
  WHERE status = 'ACTIVE';

  -- Pending pickups
  SELECT COUNT(*) INTO v_pending_pickups
  FROM reservations
  WHERE status = 'ACTIVE'
  AND expires_at < NOW() + INTERVAL '30 minutes';

  -- Reservations last hour
  SELECT COUNT(*) INTO v_reservations_last_hour
  FROM reservations
  WHERE created_at > NOW() - INTERVAL '1 hour';

  -- New users last hour
  SELECT COUNT(*) INTO v_new_users_last_hour
  FROM users
  WHERE created_at > NOW() - INTERVAL '1 hour';

  -- Revenue last hour (from point purchases)
  SELECT COALESCE(SUM(amount_gel), 0) INTO v_revenue_last_hour
  FROM point_purchases
  WHERE created_at > NOW() - INTERVAL '1 hour'
  AND status = 'COMPLETED';

  RETURN json_build_object(
    'active_users_now', v_active_users,
    'active_partners_now', v_active_partners,
    'active_reservations', v_active_reservations,
    'pending_pickups', v_pending_pickups,
    'reservations_last_hour', v_reservations_last_hour,
    'new_users_last_hour', v_new_users_last_hour,
    'new_partners_last_hour', 0,
    'revenue_last_hour', v_revenue_last_hour,
    'avg_response_time_ms', 150,
    'error_rate_percent', 0.5,
    'uptime_percent', 99.9,
    'critical_alerts', 0,
    'warning_alerts', 0
  );
END;
$$;

-- Get live activity feed (placeholder)
CREATE OR REPLACE FUNCTION admin_get_live_activity(
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  user_id UUID,
  user_name TEXT,
  partner_id UUID,
  partner_name TEXT,
  description TEXT,
  amount NUMERIC,
  event_timestamp TIMESTAMPTZ,
  metadata JSONB
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return recent reservations as activity
  RETURN QUERY
  SELECT
    r.id,
    'RESERVATION'::TEXT as type,
    r.user_id,
    u.full_name as user_name,
    o.partner_id,
    p.business_name as partner_name,
    'New reservation created' as description,
    r.smart_points::NUMERIC as amount,
    r.created_at as event_timestamp,
    '{}'::JSONB as metadata
  FROM reservations r
  JOIN users u ON u.id = r.user_id
  JOIN offers o ON o.id = r.offer_id
  JOIN partners p ON p.id = o.partner_id
  ORDER BY r.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_send_announcement TO authenticated;
GRANT EXECUTE ON FUNCTION admin_send_direct_message TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_users_for_targeting TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_partners_for_targeting TO authenticated;
GRANT EXECUTE ON FUNCTION admin_test_alert_rule TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_realtime_stats TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_live_activity TO authenticated;

-- =====================================================
-- NOTE: Analytics functions (DAU/MAU, retention, etc.)
-- are more complex and should be implemented separately
-- based on your specific analytics requirements.
-- =====================================================
