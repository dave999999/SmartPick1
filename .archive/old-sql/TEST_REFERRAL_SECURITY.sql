-- Test Script: Verify Referral Security System
-- Run this after deploying 20251120_referral_abuse_prevention.sql

-- 1. Verify tables exist
SELECT 'referral_tracking' as table_name, COUNT(*) as row_count FROM referral_tracking
UNION ALL
SELECT 'referral_limits', COUNT(*) FROM referral_limits;

-- 2. Verify functions exist
SELECT 
  proname as function_name,
  pronargs as num_args
FROM pg_proc 
WHERE proname IN (
  'apply_referral_code_with_rewards',
  'check_referral_limits',
  'calculate_referral_suspicion_score',
  'admin_review_referral'
)
ORDER BY proname;

-- 3. Test fraud scoring (should return 0 for clean data)
-- Note: This test doesn't require the user to exist
SELECT calculate_referral_suspicion_score(
  (SELECT id FROM users LIMIT 1), -- Use first real user
  '127.0.0.1'::inet,
  'test_fingerprint'
) as test_suspicion_score;

-- 4. Test limit checking (should return allowed: true for new user)
-- Note: This test creates a referral_limits entry, so user must exist
SELECT check_referral_limits(
  (SELECT id FROM users LIMIT 1) -- Use first real user
) as limit_check;

-- 5. Verify indexes
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename IN ('referral_tracking', 'referral_limits')
ORDER BY tablename, indexname;

-- 6. Test RPC permissions
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name LIKE '%referral%'
  AND routine_schema = 'public'
ORDER BY routine_name;

-- Expected Results:
-- ✅ All tables have 0 rows (new deployment)
-- ✅ 4 functions exist
-- ✅ Suspicion score = 0 (clean test)
-- ✅ Limit check = {"allowed": true}
-- ✅ 7+ indexes created
-- ✅ All functions are SECURITY DEFINER
