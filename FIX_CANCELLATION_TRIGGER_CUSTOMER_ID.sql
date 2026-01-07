-- Fix: Update trigger to use customer_id instead of user_id
-- The reservations table has 'customer_id', not 'user_id'

CREATE OR REPLACE FUNCTION track_reservation_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only track when status changes to CANCELLED
  IF OLD.status != 'CANCELLED' AND NEW.status = 'CANCELLED' THEN
    INSERT INTO user_cancellation_tracking (user_id, reservation_id, cancelled_at)
    VALUES (NEW.customer_id, NEW.id, NOW())
    ON CONFLICT (reservation_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger already exists, just updating the function
-- The existing trigger will now use the corrected function

-- Test: Check if trigger is active
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'track_cancellation_trigger';
