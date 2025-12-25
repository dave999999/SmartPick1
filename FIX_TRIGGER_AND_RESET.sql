-- Step 1: Check trigger status
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trg_track_cancellation';

-- Step 2: Recreate trigger function and trigger
DROP TRIGGER IF EXISTS trg_track_cancellation ON public.reservations;

CREATE OR REPLACE FUNCTION track_reservation_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only track if status changed to CANCELLED
  IF NEW.status = 'CANCELLED' AND (OLD.status IS NULL OR OLD.status != 'CANCELLED') THEN
    -- Insert into cancellation tracking
    INSERT INTO user_cancellation_tracking (user_id, reservation_id, cancelled_at)
    VALUES (NEW.customer_id, NEW.id, NOW())
    ON CONFLICT (reservation_id) DO NOTHING;
    
    RAISE NOTICE 'Cancellation tracked for user % reservation %', NEW.customer_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_cancellation
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION track_reservation_cancellation();

-- Step 3: Verify trigger is active
SELECT 
  tgname,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trg_track_cancellation';

-- Step 4: RESET your old cancellation count to start fresh
DELETE FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com');

-- Step 5: Verify count is 0
SELECT COUNT(*) FROM user_cancellation_tracking
WHERE user_id = (SELECT id FROM users WHERE email = 'davitbatumashvili@gmail.com');
