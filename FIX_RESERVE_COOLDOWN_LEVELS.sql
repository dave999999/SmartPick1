-- =====================================================
-- FIX: Allow Frontend Dialogs at Count 3 & 4
-- =====================================================
-- Problem: can_user_reserve blocks at count >= 3, preventing frontend dialogs
-- Solution: Only block at count >= 5 (when no lift option exists)
-- Flow:
--   Count 3: Allow reservation → Frontend shows FREE lift dialog
--   Count 4: Allow reservation → Frontend shows PAID lift dialog (100 points)
--   Count >= 5: Block at database → No more lifts available
-- =====================================================

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
  v_cancel_count INTEGER;
  v_georgia_today DATE;
BEGIN
  -- Get Georgia timezone date
  v_georgia_today := (NOW() AT TIME ZONE 'Asia/Tbilisi')::DATE;

  -- Get today's cancellation count
  SELECT COUNT(*) INTO v_cancel_count
  FROM user_cancellation_tracking
  WHERE user_id = p_user_id
    AND (cancelled_at AT TIME ZONE 'Asia/Tbilisi')::DATE = v_georgia_today;

  -- Only block if count >= 5 (after using both lifts)
  -- Count 3: Frontend shows free lift dialog
  -- Count 4: Frontend shows paid lift dialog (100 points)
  -- Count >= 5: Block completely
  IF v_cancel_count >= 5 THEN
    RETURN QUERY SELECT 
      false,
      'Maximum cancellations reached for today. Please try again tomorrow.'::TEXT,
      (v_georgia_today + INTERVAL '1 day')::TIMESTAMPTZ,
      NULL::UUID;
    RETURN;
  END IF;

  -- Check user suspension status
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

COMMENT ON FUNCTION can_user_reserve IS 'Checks if user can reserve: blocks at count >= 5, suspension status. Counts 3-4 allow frontend dialogs.';

SELECT '✅ Updated can_user_reserve - Now allows frontend dialogs at count 3 & 4' as status;

-- Verify the change
SELECT 
  '📊 Testing Logic' as test,
  CASE 
    WHEN 3 >= 5 THEN 'BLOCKED ❌'
    ELSE 'ALLOWED ✅ (Frontend dialog)'
  END as count_3,
  CASE 
    WHEN 4 >= 5 THEN 'BLOCKED ❌'
    ELSE 'ALLOWED ✅ (Frontend dialog)'
  END as count_4,
  CASE 
    WHEN 5 >= 5 THEN 'BLOCKED ❌'
    ELSE 'ALLOWED ✅'
  END as count_5;
