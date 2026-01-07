-- =========================================================
-- IMPROVE RATE LIMIT AUTOMATIC CLEANUP
-- =========================================================
-- Current problem: Edge function only deletes records > 30 days old
-- But rate limits check windows of 15min - 24hrs
-- Solution: Add automatic cleanup function that runs hourly

-- 1. Create function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Delete records older than 48 hours (2x the longest rate limit window)
  -- This keeps records for debugging while preventing unlimited growth
  DELETE FROM rate_limits
  WHERE created_at < NOW() - INTERVAL '48 hours';
  
  RAISE NOTICE 'Cleaned up old rate limit records';
END;
$$;

-- 2. Schedule this function to run hourly using pg_cron
-- Note: pg_cron must be enabled in your Supabase project
-- Enable it in: Dashboard > Database > Extensions > pg_cron

SELECT cron.schedule(
  'cleanup-rate-limits',           -- Job name
  '0 * * * *',                     -- Run every hour (at minute 0)
  'SELECT cleanup_old_rate_limits();'
);

-- Verify scheduled job
SELECT * FROM cron.job WHERE jobname = 'cleanup-rate-limits';

-- 3. Manual run to clean up immediately
SELECT cleanup_old_rate_limits();

-- 4. Check results
SELECT 
  COUNT(*) as total_records,
  MIN(created_at) as oldest,
  MAX(created_at) as newest,
  NOW() - MIN(created_at) as max_age
FROM rate_limits;

-- =========================================================
-- ALTERNATIVE: Use Supabase Storage Policies (no pg_cron)
-- =========================================================
-- If pg_cron is not available, you can:
-- 1. Run cleanup in the Edge Function (already does this but 30 days)
-- 2. Add a database trigger
-- 3. Run manual cleanup periodically

-- Option: Update Edge Function cleanup to 48 hours instead of 30 days
-- Edit supabase/functions/rate-limit/index.ts line 144:
-- Change: const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
-- To:     const twoDaysAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000))
