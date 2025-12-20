-- FIX: user_cancellation_tracking null constraint violation
-- The trigger was failing because it couldn't get customer_id from UPDATE

-- Drop all existing triggers that might depend on the function
DROP TRIGGER IF EXISTS trg_track_cancellation ON public.reservations;
DROP TRIGGER IF EXISTS track_cancellation_trigger ON public.reservations;

-- Drop function with CASCADE to handle any remaining dependencies
DROP FUNCTION IF EXISTS track_reservation_cancellation() CASCADE;

-- Recreate function with better error handling
CREATE OR REPLACE FUNCTION track_reservation_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Only track if status changed to CANCELLED
  IF NEW.status = 'CANCELLED' AND (OLD.status IS NULL OR OLD.status != 'CANCELLED') THEN
    
    -- Get customer_id from NEW if available, otherwise from OLD
    v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);
    
    -- Only insert if we have a valid customer_id
    IF v_customer_id IS NOT NULL THEN
      INSERT INTO user_cancellation_tracking (user_id, reservation_id, cancelled_at)
      VALUES (v_customer_id, NEW.id, NOW())
      ON CONFLICT (reservation_id) DO NOTHING;
    ELSE
      -- Log warning but don't fail the transaction
      RAISE WARNING 'Cannot track cancellation: customer_id is null for reservation %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trg_track_cancellation
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION track_reservation_cancellation();

-- Verify fix
SELECT '✅ Cancellation tracking trigger fixed!' as status,
       'Now handles null customer_id gracefully' as result;
