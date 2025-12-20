-- =====================================================
-- FIX: Add Cooldown Check to can_user_reserve Function
-- =====================================================
-- Problem: Reservation button not working after cooldown fixes
-- Cause: can_user_reserve() doesn't check cooldown status
-- Solution: Update can_user_reserve to check both penalties AND cooldown
-- =====================================================

-- Drop existing function first (has different return type)
DROP FUNCTION IF EXISTS public.can_user_reserve(UUID);

CREATE OR REPLACE FUNCTION public.can_user_reserve(p_user_id UUID)
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
  v_in_cooldown BOOLEAN;
  v_cooldown_until TIMESTAMPTZ;
  v_cancel_count INTEGER;
BEGIN
  -- Check cooldown first
  SELECT in_cooldown, cooldown_until, cancellation_count
  INTO v_in_cooldown, v_cooldown_until, v_cancel_count
  FROM is_user_in_cooldown(p_user_id);

  -- If in cooldown, block reservation
  IF v_in_cooldown THEN
    RETURN QUERY SELECT 
      false,
      'Too many cancellations. Please wait before making a new reservation.'::TEXT,
      v_cooldown_until,
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
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Return suspension info
  RETURN QUERY SELECT 
    false,
    'Account suspended due to missed pickup'::TEXT,
    v_suspended_until,
    v_penalty.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_user_reserve IS 'Checks if user can reserve: cooldown, penalties, and suspension status';

SELECT '✅ Updated can_user_reserve to check cooldown' as status;
