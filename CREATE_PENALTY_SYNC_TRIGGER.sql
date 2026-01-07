-- =========================================================
-- AUTO-SYNC USER SUSPENSION STATUS FROM PENALTIES
-- =========================================================
-- Purpose: Automatically update users table when penalties change
-- Eliminates need for manual FIX_USER_SUSPENSION_FLAGS.sql script
-- 
-- This trigger ensures that users.is_suspended and users.suspended_until
-- always reflect the current state of active penalties.

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS sync_user_suspension_on_penalty ON user_penalties;
DROP FUNCTION IF EXISTS update_user_suspension_status();

-- Create function to sync suspension status
CREATE OR REPLACE FUNCTION update_user_suspension_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_active_penalty BOOLEAN;
  v_latest_suspended_until TIMESTAMPTZ;
  v_highest_offense INT;
BEGIN
  RAISE NOTICE 'Penalty trigger fired for user % (offense: %, active: %, ack: %)', 
    NEW.user_id, NEW.offense_number, NEW.is_active, NEW.acknowledged;

  -- Check if user has any active, unacknowledged penalties
  SELECT 
    EXISTS(
      SELECT 1 
      FROM user_penalties 
      WHERE user_id = NEW.user_id 
        AND is_active = TRUE 
        AND acknowledged = FALSE
    ),
    MAX(suspended_until),
    MAX(offense_number)
  INTO v_has_active_penalty, v_latest_suspended_until, v_highest_offense
  FROM user_penalties
  WHERE user_id = NEW.user_id 
    AND is_active = TRUE 
    AND acknowledged = FALSE;

  RAISE NOTICE 'Penalty check result - has_active: %, suspended_until: %, highest_offense: %', 
    v_has_active_penalty, v_latest_suspended_until, v_highest_offense;

  -- Update users table based on penalty status
  IF v_has_active_penalty THEN
    -- User has active penalty - set suspended
    UPDATE users 
    SET 
      is_suspended = TRUE,
      suspended_until = v_latest_suspended_until,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'User % SUSPENDED until %', NEW.user_id, v_latest_suspended_until;
  ELSE
    -- No active penalties - clear suspension
    UPDATE users 
    SET 
      is_suspended = FALSE,
      suspended_until = NULL,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RAISE NOTICE 'User % suspension CLEARED', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER sync_user_suspension_on_penalty
  AFTER INSERT OR UPDATE OF is_active, acknowledged, suspended_until
  ON user_penalties
  FOR EACH ROW
  EXECUTE FUNCTION update_user_suspension_status();

-- Add comments for documentation
COMMENT ON FUNCTION update_user_suspension_status() IS 
  'Automatically syncs users.is_suspended and users.suspended_until based on active penalties. 
   Eliminates need for manual suspension flag updates.';

COMMENT ON TRIGGER sync_user_suspension_on_penalty ON user_penalties IS 
  'Ensures users table always reflects current penalty status. 
   Fires on INSERT or when is_active, acknowledged, or suspended_until changes.';

-- Verify trigger was created
SELECT 
  '=== TRIGGER CREATED SUCCESSFULLY ===' as status,
  'Users table will now auto-sync with penalties' as message;

-- Show trigger details
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_user_suspension_on_penalty';

-- Test: Check if trigger exists and is enabled
SELECT 
  tgname as trigger_name,
  tgenabled as is_enabled,
  tgtype as trigger_type,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'sync_user_suspension_on_penalty';
