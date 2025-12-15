-- =====================================================
-- VERIFICATION SCRIPT: Test All Scalability Improvements
-- =====================================================
-- Run these queries in Supabase SQL Editor to verify everything works
-- =====================================================

-- ===============================================
-- 1. Verify Rate Limiting Table
-- ===============================================
SELECT 'Rate Limiting Table' as test;
SELECT COUNT(*) as rate_limit_records FROM api_rate_limits;
-- Expected: 0 (no requests yet)

-- ===============================================
-- 2. Test Rate Limit Function
-- ===============================================
SELECT 'Rate Limit Function Test' as test;
SELECT check_rate_limit('test_endpoint', 5, 60) as result;
-- Expected: true (1st call)

SELECT check_rate_limit('test_endpoint', 5, 60) as result;
-- Expected: true (2nd call)

SELECT check_rate_limit('test_endpoint', 5, 60) as result;
-- Expected: true (3rd call)

-- Check rate limit record was created
SELECT user_ip, endpoint, request_count, window_start 
FROM api_rate_limits 
ORDER BY window_start DESC 
LIMIT 1;
-- Expected: 1 row with request_count = 3

-- ===============================================
-- 3. Test Connection Pool Monitoring
-- ===============================================
SELECT 'Connection Pool Stats' as test;
SELECT * FROM get_connection_pool_stats();
-- Expected: Returns metrics (active_connections, max_connections, usage_percent, etc.)

-- ===============================================
-- 4. Test Viewport Function with Rate Limiting
-- ===============================================
SELECT 'Viewport Function Test' as test;
SELECT COUNT(*) as offer_count 
FROM get_offers_in_viewport(41.8, 41.6, 44.9, 44.7, NULL, 10);
-- Expected: Returns offer count (0-10)

-- ===============================================
-- 5. Test Near Location Function with Rate Limiting
-- ===============================================
SELECT 'Near Location Function Test' as test;
SELECT COUNT(*) as offer_count 
FROM get_offers_near_location(41.7, 44.8, 5000, NULL, 10);
-- Expected: Returns offer count (0-10)

-- ===============================================
-- 6. Verify Indexes Exist
-- ===============================================
SELECT 'Index Verification' as test;
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'api_rate_limits'
ORDER BY indexname;
-- Expected: idx_rate_limits_lookup, idx_rate_limits_created

-- ===============================================
-- 7. Check pg_cron Job (if available)
-- ===============================================
SELECT 'pg_cron Jobs' as test;
SELECT jobid, jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'cleanup-rate-limits';
-- Expected: 1 row if pg_cron is available, or error if not (that's OK)

-- ===============================================
-- SUCCESS CRITERIA
-- ===============================================
-- ✅ All tables and functions created
-- ✅ Rate limiting works (tracks requests)
-- ✅ Connection pool monitoring returns data
-- ✅ Viewport and location functions work with rate limits
-- ✅ Indexes exist for performance
