-- =====================================================
-- FAILED PICKUP PENALTY SYSTEM
-- Automatically marks expired reservations as failed
-- and applies penalty/ban system
-- =====================================================

-- Add FAILED_PICKUP status if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type 
    WHERE typname = 'reservation_status'
  ) THEN
    CREATE TYPE reservation_status AS ENUM ('ACTIVE', 'PICKED_UP', 'EXPIRED', 'CANCELLED', 'FAILED_PICKUP');
  ELSE
    -- Add FAILED_PICKUP to existing enum if not present
    BEGIN
      ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'FAILED_PICKUP';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- Function to automatically expire and penalize failed pickups
CREATE OR REPLACE FUNCTION auto_expire_failed_pickups()
RETURNS TABLE(reservation_id UUID, user_id UUID, penalty_applied BOOLEAN, message TEXT) AS $$
DECLARE
  v_rec RECORD;
  v_new_count INT;
BEGIN
  FOR v_rec IN 
    SELECT r.id AS res_id, r.customer_id, u.penalty_count, r.quantity, r.offer_id
    FROM reservations r
    JOIN users u ON u.id = r.customer_id
    WHERE r.status = 'ACTIVE'
      AND r.expires_at < NOW()
  LOOP
    -- Mark as failed pickup
    UPDATE reservations SET status = 'FAILED_PICKUP', updated_at = NOW() WHERE id = v_rec.res_id;
    -- Increment simple penalty counter
    UPDATE users SET penalty_count = COALESCE(penalty_count,0) + 1 WHERE id = v_rec.customer_id RETURNING penalty_count INTO v_new_count;
    -- Restore offer quantity
    UPDATE offers SET quantity_available = quantity_available + v_rec.quantity, updated_at = NOW() WHERE id = v_rec.offer_id;
    reservation_id := v_rec.res_id;
    user_id := v_rec.customer_id;
    penalty_applied := TRUE;
    message := format('Failed pickup processed. Penalty count now %s', v_new_count);
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: To schedule automatic execution, enable pg_cron extension in Supabase:
-- 1. Go to Database > Extensions in Supabase Dashboard
-- 2. Enable "pg_cron" extension
-- 3. Then run this SQL to create the cron job:
--
-- SELECT cron.schedule(
--   'auto-expire-failed-pickups',
--   '*/5 * * * *',
--   $$SELECT * FROM auto_expire_failed_pickups()$$
-- );
--
-- Alternative: Call this function from your application periodically,
-- or set up a Supabase Edge Function with a cron trigger.

COMMENT ON FUNCTION auto_expire_failed_pickups IS 'Simplified: marks expired ACTIVE reservations as FAILED_PICKUP, increments penalty_count, restores quantity.';
