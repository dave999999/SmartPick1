-- TEST_RLS_POLICIES.sql
-- Comprehensive test to verify RLS policies are working correctly

-- ============================================================================
-- 1. CHECK ALL POLICIES EXIST
-- ============================================================================

SELECT 
  '=== USER_SESSIONS POLICIES ===' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'user_sessions'
ORDER BY policyname;

SELECT 
  '=== SUSPICIOUS_ACTIVITY POLICIES ===' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'suspicious_activity'
ORDER BY policyname;

SELECT 
  '=== IP_BLOCKLIST POLICIES ===' as section,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'ip_blocklist'
ORDER BY policyname;

-- ============================================================================
-- 2. VERIFY POLICY COUNT (Should have 4 policies per table)
-- ============================================================================

SELECT 
  '=== POLICY COUNT CHECK ===' as section,
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 4 THEN '✓ Correct'
    ELSE '✗ Expected 4 policies (1 SELECT + 3 INSERT/UPDATE/DELETE)'
  END as status
FROM pg_policies 
WHERE tablename IN ('user_sessions', 'suspicious_activity', 'ip_blocklist')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 3. CHECK FOR DUPLICATE POLICIES (Should be none)
-- ============================================================================

SELECT 
  '=== DUPLICATE POLICY CHECK ===' as section,
  tablename,
  cmd as action,
  COUNT(*) as duplicate_count,
  CASE 
    WHEN COUNT(*) > 1 THEN '✗ Multiple policies for same action!'
    ELSE '✓ No duplicates'
  END as status
FROM pg_policies 
WHERE tablename IN ('user_sessions', 'suspicious_activity', 'ip_blocklist')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;

-- If no rows returned, that's good - means no duplicates

-- ============================================================================
-- 4. TEST FUNCTIONS EXIST
-- ============================================================================

SELECT 
  '=== FUNCTION EXISTENCE CHECK ===' as section,
  proname as function_name,
  pg_get_function_arguments(oid) as parameters,
  '✓ Exists' as status
FROM pg_proc 
WHERE proname IN (
  'is_ip_blocked',
  'log_suspicious_activity',
  'invalidate_expired_sessions',
  'invalidate_inactive_sessions',
  'detect_session_anomalies',
  'update_session_activity',
  'cleanup_old_rate_limits',
  'cleanup_old_suspicious_activity',
  'cleanup_expired_ip_blocks'
)
ORDER BY proname;

-- ============================================================================
-- 5. CHECK RLS IS ENABLED
-- ============================================================================

SELECT 
  '=== RLS ENABLED CHECK ===' as section,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✓ RLS Enabled'
    ELSE '✗ RLS NOT ENABLED!'
  END as status
FROM pg_tables 
WHERE tablename IN ('user_sessions', 'suspicious_activity', 'ip_blocklist')
ORDER BY tablename;

-- ============================================================================
-- 6. TEST BASIC FUNCTIONALITY
-- ============================================================================

-- Test is_ip_blocked function
SELECT 
  '=== FUNCTION TEST: is_ip_blocked ===' as section,
  is_ip_blocked('192.168.1.1') as result,
  'Should return FALSE (IP not blocked)' as expected;

-- Test detect_session_anomalies function (should return empty if no anomalies)
SELECT 
  '=== FUNCTION TEST: detect_session_anomalies ===' as section,
  COUNT(*) as anomaly_count,
  'Should return 0 or low number' as expected
FROM detect_session_anomalies();

-- ============================================================================
-- 7. VERIFY NO ERRORS IN POLICY DEFINITIONS
-- ============================================================================

SELECT 
  '=== POLICY DEFINITION CHECK ===' as section,
  policyname,
  CASE 
    WHEN qual IS NOT NULL THEN '✓ Has USING clause'
    ELSE '○ No USING clause (INSERT only)'
  END as using_status,
  CASE 
    WHEN with_check IS NOT NULL THEN '✓ Has WITH CHECK clause'
    ELSE '○ No WITH CHECK clause'
  END as check_status
FROM pg_policies 
WHERE tablename IN ('user_sessions', 'suspicious_activity', 'ip_blocklist')
ORDER BY tablename, policyname;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  '=== DEPLOYMENT STATUS ===' as section,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_policies 
      WHERE tablename IN ('user_sessions', 'suspicious_activity', 'ip_blocklist')
    ) = 12 -- 4 policies × 3 tables
    THEN '✓ All policies created successfully'
    ELSE '✗ Policy count mismatch'
  END as policies_status,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_proc 
      WHERE proname IN (
        'is_ip_blocked', 'log_suspicious_activity', 'invalidate_expired_sessions',
        'invalidate_inactive_sessions', 'detect_session_anomalies', 'update_session_activity',
        'cleanup_old_rate_limits', 'cleanup_old_suspicious_activity', 'cleanup_expired_ip_blocks'
      )
    ) = 9
    THEN '✓ All functions created successfully'
    ELSE '✗ Function count mismatch'
  END as functions_status,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM pg_tables 
      WHERE tablename IN ('user_sessions', 'suspicious_activity', 'ip_blocklist')
        AND rowsecurity = true
    ) = 3
    THEN '✓ RLS enabled on all tables'
    ELSE '✗ RLS not enabled on all tables'
  END as rls_status;
