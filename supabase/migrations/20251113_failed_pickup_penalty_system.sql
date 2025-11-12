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
RETURNS TABLE(
  reservation_id UUID,
  user_id UUID,
  user_email TEXT,
  penalty_applied BOOLEAN,
  ban_applied BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_rec RECORD;
  v_penalty_count INTEGER;
  v_ban_id UUID;
  v_penalty_hours INTEGER;
  v_penalty_until TIMESTAMPTZ;
BEGIN
  -- Find all ACTIVE reservations that have expired
  FOR v_rec IN 
    SELECT 
      r.id as res_id,
      r.customer_id,
      u.email,
      u.penalty_count,
      r.total_price
    FROM reservations r
    JOIN users u ON u.id = r.customer_id
    WHERE r.status = 'ACTIVE'
      AND r.expires_at < NOW()
      AND u.is_banned = FALSE
  LOOP
    -- Mark reservation as FAILED_PICKUP
    UPDATE reservations 
    SET 
      status = 'FAILED_PICKUP',
      updated_at = NOW()
    WHERE id = v_rec.res_id;

    -- Increment penalty count
    v_penalty_count := COALESCE(v_rec.penalty_count, 0) + 1;
    
    -- Determine penalty duration based on offense count
    IF v_penalty_count = 1 THEN
      v_penalty_hours := 1; -- 1st offense: 1 hour
    ELSIF v_penalty_count = 2 THEN
      v_penalty_hours := 24; -- 2nd offense: 24 hours
    ELSIF v_penalty_count >= 3 THEN
      -- 3rd offense: permanent ban
      v_penalty_hours := NULL;
    END IF;

    IF v_penalty_count >= 3 THEN
      -- Apply permanent ban
      INSERT INTO user_bans (
        user_id,
        banned_by,
        reason,
        ban_type,
        expires_at,
        internal_notes,
        is_active
      ) VALUES (
        v_rec.customer_id,
        v_rec.customer_id, -- System-initiated
        'Failed to pickup reservation 3 times',
        'PERMANENT',
        NULL,
        'Auto-ban triggered by failed pickup penalty system',
        TRUE
      ) RETURNING id INTO v_ban_id;

      UPDATE users 
      SET 
        is_banned = TRUE,
        penalty_count = v_penalty_count,
        updated_at = NOW()
      WHERE id = v_rec.customer_id;

      -- Return ban notification
      reservation_id := v_rec.res_id;
      user_id := v_rec.customer_id;
      user_email := v_rec.email;
      penalty_applied := FALSE;
      ban_applied := TRUE;
      message := 'User permanently banned after 3rd failed pickup';
      RETURN NEXT;
    ELSE
      -- Apply temporary penalty
      v_penalty_until := NOW() + (v_penalty_hours || ' hours')::INTERVAL;
      
      UPDATE users 
      SET 
        penalty_count = v_penalty_count,
        penalty_until = v_penalty_until,
        updated_at = NOW()
      WHERE id = v_rec.customer_id;

      -- Return penalty notification
      reservation_id := v_rec.res_id;
      user_id := v_rec.customer_id;
      user_email := v_rec.email;
      penalty_applied := TRUE;
      ban_applied := FALSE;
      message := format('Temporary penalty applied: %s hours', v_penalty_hours);
      RETURN NEXT;
    END IF;

    -- Log transaction for penalty (points lost)
    INSERT INTO transactions (
      user_id,
      points,
      type,
      description,
      metadata
    ) VALUES (
      v_rec.customer_id,
      -v_rec.total_price,
      'FAILED_PICKUP_PENALTY',
      format('Failed to pickup reservation. Penalty %s/3', v_penalty_count),
      jsonb_build_object(
        'reservation_id', v_rec.res_id,
        'penalty_count', v_penalty_count,
        'penalty_type', CASE 
          WHEN v_penalty_count >= 3 THEN 'permanent_ban'
          ELSE 'temporary_suspension'
        END
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cron job to run this function every 5 minutes
-- (Requires pg_cron extension - enable in Supabase dashboard if not already)
SELECT cron.schedule(
  'auto-expire-failed-pickups',
  '*/5 * * * *', -- Every 5 minutes
  $$SELECT * FROM auto_expire_failed_pickups()$$
);

COMMENT ON FUNCTION auto_expire_failed_pickups IS 'Automatically marks expired ACTIVE reservations as FAILED_PICKUP and applies penalty/ban system';
