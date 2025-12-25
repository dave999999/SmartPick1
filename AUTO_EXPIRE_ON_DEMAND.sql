-- Create on-demand expiration functions (no cron needed)
-- These are called when user loads their page or tries to reserve

-- 1. Expire only specific user's reservations (lightweight)
CREATE OR REPLACE FUNCTION expire_user_reservations(p_user_id UUID)
RETURNS TABLE(expired_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Mark user's expired reservations as FAILED_PICKUP
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
  SELECT COUNT(*)::INTEGER INTO v_count FROM expired;
  
  -- Increment penalty count if any expired
  IF v_count > 0 THEN
    UPDATE users 
    SET penalty_count = COALESCE(penalty_count, 0) + v_count
    WHERE id = p_user_id;
  END IF;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update can_user_reserve to auto-expire first (SAFE VERSION)
-- Drop old function first to avoid conflict
DROP FUNCTION IF EXISTS can_user_reserve(UUID);

CREATE OR REPLACE FUNCTION can_user_reserve(p_user_id UUID)
RETURNS TABLE (
  can_reserve BOOLEAN,
  reason TEXT,
  suspended_until TIMESTAMPTZ,
  penalty_id UUID
) AS $$
DECLARE
  v_is_suspended BOOLEAN;
  v_suspended_until TIMESTAMPTZ;
  v_penalty RECORD;
  v_cooldown RECORD;
  v_has_active BOOLEAN;
BEGIN
  -- First, auto-expire any old reservations for this user
  PERFORM expire_user_reservations(p_user_id);
  
  -- Check cooldown status (returns table with in_cooldown, cooldown_until, etc.)
  SELECT * INTO v_cooldown
  FROM is_user_in_cooldown(p_user_id)
  LIMIT 1;
  
  -- If in cooldown, block reservation
  IF v_cooldown.in_cooldown THEN
    RETURN QUERY SELECT 
      false,
      'You have made 3 cancellations today. Please wait until tomorrow to make new reservations.'::TEXT,
      v_cooldown.cooldown_until,
      NULL::UUID;
    RETURN;
  END IF;

  -- Check if user has active reservations (after expiring old ones)
  SELECT EXISTS(
    SELECT 1 FROM reservations
    WHERE customer_id = p_user_id
      AND status = 'ACTIVE'
  ) INTO v_has_active;

  -- Block if user already has an active reservation
  IF v_has_active THEN
    RETURN QUERY SELECT 
      false,
      'You already have an active reservation.'::TEXT,
      NULL::TIMESTAMPTZ,
      NULL::UUID;
    RETURN;
  END IF;

  -- Get user status
  SELECT u.is_suspended, u.suspended_until 
  INTO v_is_suspended, v_suspended_until
  FROM public.users u
  WHERE u.id = p_user_id;
  
  -- If not suspended, allow
  IF NOT v_is_suspended THEN
    RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if suspension expired
  IF v_suspended_until IS NOT NULL AND v_suspended_until < NOW() THEN
    -- Auto-lift expired suspension
    UPDATE public.users
    SET is_suspended = false, suspended_until = NULL
    WHERE id = p_user_id;
    
    UPDATE public.user_penalties
    SET is_active = false
    WHERE user_id = p_user_id AND is_active = true;
    
    RETURN QUERY SELECT true, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;
  
  -- Get active penalty
  SELECT * INTO v_penalty
  FROM public.user_penalties
  WHERE user_id = p_user_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Still suspended
  RETURN QUERY SELECT 
    false,
    'Your account is currently suspended due to penalty.'::TEXT,
    v_suspended_until,
    v_penalty.id;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION expire_user_reservations TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_reserve TO authenticated;

-- Test with davitbatumashvili@gmail.com
SELECT expire_user_reservations(
  (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
);

-- Verify it worked
SELECT 
  r.id,
  r.status,
  r.expires_at,
  CASE
    WHEN r.expires_at < NOW() THEN 'Should be FAILED_PICKUP now'
    ELSE 'Still valid'
  END as check
FROM reservations r
WHERE r.customer_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com')
ORDER BY r.created_at DESC
LIMIT 5;
