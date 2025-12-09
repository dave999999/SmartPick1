-- =====================================================
-- REALTIME OPTIMIZATION - December 9, 2025
-- =====================================================
-- Purpose: Optimize realtime configuration to prevent rate spikes
-- Current issue: Realtime was 6,000 calls/min, now 552/min (91% reduction)
-- Goal: Ensure it stays stable and efficient
-- =====================================================

-- =====================================================
-- 1. CREATE INDEXES FOR REALTIME EFFICIENCY
-- =====================================================

-- Index for reservation realtime subscriptions (partner monitoring)
CREATE INDEX IF NOT EXISTS idx_reservations_partner_realtime 
ON public.reservations(partner_id, status, created_at DESC)
WHERE status IN ('pending', 'ready');

-- Index for customer reservation subscriptions
CREATE INDEX IF NOT EXISTS idx_reservations_customer_realtime
ON public.reservations(customer_id, status, updated_at DESC)
WHERE status IN ('pending', 'ready', 'picked_up');

-- Index for pending partners (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_partners_pending_realtime
ON public.partners(status, created_at DESC)
WHERE status = 'pending';

-- Index for offer updates (if you add realtime for offers)
CREATE INDEX IF NOT EXISTS idx_offers_active_realtime
ON public.offers(partner_id, status, updated_at DESC)
WHERE status = 'active';

-- =====================================================
-- 2. CREATE FILTERED PUBLICATION FOR REALTIME
-- =====================================================
-- This limits what data flows through realtime channels
-- Reduces unnecessary change notifications

-- Check existing publications
-- You may already have supabase_realtime publication

-- Option A: If you want to be very specific, create filtered publication
DO $$
BEGIN
  -- Only publish changes for active/pending records
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'smartpick_realtime_filtered'
  ) THEN
    
    -- Create publication for only relevant changes
    CREATE PUBLICATION smartpick_realtime_filtered FOR TABLE
      public.reservations WHERE (status IN ('pending', 'ready', 'picked_up')),
      public.partners WHERE (status = 'pending'),
      public.notifications WHERE (read = false);
    
    -- Note: You'll need to configure Supabase to use this publication
    -- in your project settings if you want to switch from default
  END IF;
END $$;

-- =====================================================
-- 3. REALTIME MONITORING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_realtime_stats()
RETURNS TABLE (
  metric text,
  value text,
  status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calls bigint;
  v_time interval;
  v_rate numeric;
BEGIN
  -- Get realtime function stats
  SELECT 
    calls,
    total_time
  INTO v_calls, v_time
  FROM pg_stat_user_functions
  WHERE schemaname = 'realtime' 
    AND funcname LIKE '%'
  LIMIT 1;

  -- Calculate rate per minute
  v_rate := CASE 
    WHEN v_time IS NOT NULL AND EXTRACT(EPOCH FROM v_time) > 0 
    THEN (v_calls::numeric / EXTRACT(EPOCH FROM v_time)) * 60
    ELSE 0 
  END;

  -- Return metrics
  RETURN QUERY
  SELECT 
    'Total Realtime Calls'::text,
    v_calls::text,
    CASE 
      WHEN v_calls < 1000000 THEN 'good'
      WHEN v_calls < 5000000 THEN 'warning'
      ELSE 'critical'
    END;

  RETURN QUERY
  SELECT 
    'Current Rate (calls/min)'::text,
    ROUND(v_rate, 0)::text,
    CASE 
      WHEN v_rate < 1000 THEN 'good'
      WHEN v_rate < 3000 THEN 'warning'
      ELSE 'critical'
    END;

  RETURN QUERY
  SELECT
    'Replication Slot Lag'::text,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn))::text,
    CASE
      WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) < 100000000 THEN 'good'
      WHEN pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) < 500000000 THEN 'warning'
      ELSE 'critical'
    END
  FROM pg_replication_slots
  WHERE slot_name LIKE 'supabase%'
  LIMIT 1;

END;
$$;

GRANT EXECUTE ON FUNCTION public.get_realtime_stats() TO authenticated;

-- =====================================================
-- 4. RECOMMENDED REALTIME BEST PRACTICES
-- =====================================================

COMMENT ON FUNCTION public.get_realtime_stats() IS 
'Monitor realtime performance. Run in admin dashboard.
Good: <1000 calls/min, Warning: 1000-3000, Critical: >3000';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check indexes created:
-- SELECT schemaname, tablename, indexname 
-- FROM pg_indexes 
-- WHERE tablename IN ('reservations', 'partners', 'offers')
--   AND indexname LIKE '%realtime%';

-- Check realtime stats:
-- SELECT * FROM get_realtime_stats();

-- Check current replication lag:
-- SELECT slot_name, 
--        pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) as lag
-- FROM pg_replication_slots 
-- WHERE slot_name LIKE 'supabase%';

-- =====================================================
