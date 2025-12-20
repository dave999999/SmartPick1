-- =====================================================
-- FIX: Replace Harsh Penalties with Friendly Cooldown
-- 
-- Current behavior (too harsh): 2nd cancel = 1hr suspension
-- Desired behavior (friendly): 3 cancels in 30min = 30min cooldown
-- =====================================================

-- Disable the harsh penalty trigger first
DROP TRIGGER IF EXISTS trg_apply_cancellation_penalty ON user_cancellation_tracking;

-- Function that ONLY logs cancellations without applying harsh penalties
CREATE OR REPLACE FUNCTION log_cancellation_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just log the cancellation, don't apply penalties
  -- The cooldown check in can_user_reserve() will handle rate limiting
  RAISE NOTICE 'Cancellation logged for user % (no penalty applied, only tracking)', NEW.user_id;
  RETURN NEW;
END;
$$;

-- NOW create new friendly cooldown trigger (after function exists)
CREATE TRIGGER trg_cooldown_on_cancellation
AFTER INSERT ON user_cancellation_tracking
FOR EACH ROW
EXECUTE FUNCTION log_cancellation_only();

-- Remove any existing penalties from database (clear slate)
DELETE FROM user_penalties 
WHERE offense_type = 'late_cancellation' 
  AND penalty_type IN ('1hour', '24h', 'permanent');

-- Clear suspension flags
UPDATE users
SET is_suspended = false,
    suspended_until = NULL,
    current_penalty_level = 0
WHERE is_suspended = true
  AND suspended_until IS NOT NULL;

SELECT '✅ Friendly Cooldown System Activated!' as status;
SELECT 'Now: 3 cancels in 30min = 30min timeout (no harsh penalties)' as behavior;
