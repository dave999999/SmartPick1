-- ============================================
-- COMPREHENSIVE DATABASE DEEP ANALYSIS
-- ============================================

-- 1. Check for orphaned records (reservations without offers)
SELECT
    'Orphaned Reservations' as check_name,
    COUNT(*) as count
FROM reservations r
LEFT JOIN offers o ON r.offer_id = o.id
WHERE o.id IS NULL;

-- 2. Check for orphaned records (reservations without users)
SELECT
    'Reservations without Users' as check_name,
    COUNT(*) as count
FROM reservations r
LEFT JOIN users u ON r.customer_id = u.id
WHERE u.id IS NULL;

-- 3. Check for orphaned points records
SELECT
    'User Points without Users' as check_name,
    COUNT(*) as count
FROM user_points up
LEFT JOIN users u ON up.user_id = u.id
WHERE u.id IS NULL;

-- 4. Check for partner points without partners
SELECT
    'Partner Points without Partners' as check_name,
    COUNT(*) as count
FROM partner_points pp
LEFT JOIN partners p ON pp.user_id = p.id
WHERE p.id IS NULL;

-- 5. Check for reservations with inconsistent status
SELECT
    'Expired but Active Reservations' as check_name,
    COUNT(*) as count
FROM reservations
WHERE status = 'ACTIVE'
  AND expires_at < NOW();

-- 6. Check for offers that should be expired
SELECT
    'Active but Expired Offers' as check_name,
    COUNT(*) as count
FROM offers
WHERE status = 'ACTIVE'
  AND expires_at < NOW();

-- 7. Check for dead rows accumulation
SELECT
    schemaname,
    relname as table_name,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_row_percent
FROM pg_stat_user_tables
WHERE n_dead_tup > 10
ORDER BY n_dead_tup DESC
LIMIT 20;

-- 8. Check for duplicate records in critical tables
SELECT
    'Duplicate User Emails' as check_name,
    COUNT(*) - COUNT(DISTINCT email) as duplicates
FROM users;

-- 9. Check for duplicate partner points
SELECT
    'Duplicate Partner Points Records' as check_name,
    COUNT(*) - COUNT(DISTINCT user_id) as duplicates
FROM partner_points;

-- 10. Check for duplicate user points
SELECT
    'Duplicate User Points Records' as check_name,
    COUNT(*) - COUNT(DISTINCT user_id) as duplicates
FROM user_points;

-- 11. Check escrow points that should be released
SELECT
    'Stale Escrow Points' as check_name,
    COUNT(*) as count,
    SUM(amount) as total_locked_points
FROM escrow_points
WHERE status IN ('PENDING', 'HELD')
  AND created_at < NOW() - INTERVAL '7 days';

-- 12. Check for reservations stuck in ACTIVE
SELECT
    'Long-running Active Reservations' as check_name,
    COUNT(*) as count
FROM reservations
WHERE status = 'ACTIVE'
  AND created_at < NOW() - INTERVAL '24 hours';

-- 13. Check total points balance consistency
SELECT
    'Total User Points Balance' as metric,
    SUM(balance) as total
FROM user_points
UNION ALL
SELECT
    'Total Partner Points Balance',
    SUM(balance)
FROM partner_points
UNION ALL
SELECT
    'Total Escrow Points',
    SUM(amount)
FROM escrow_points;

-- 14. Check for negative balances (should never happen)
SELECT
    'Users with Negative Balance' as check_name,
    COUNT(*) as count
FROM user_points
WHERE balance < 0
UNION ALL
SELECT
    'Partners with Negative Balance',
    COUNT(*)
FROM partner_points
WHERE balance < 0;

-- 15. Check CSRF token cleanup
SELECT
    'Expired CSRF Tokens (need cleanup)' as check_name,
    COUNT(*) as count
FROM csrf_tokens
WHERE expires_at < NOW();

-- 16. Check realtime publication configuration
SELECT
    pubname,
    COUNT(*) as table_count
FROM pg_publication_tables
WHERE pubname IN ('supabase_realtime', 'supabase_realtime_messages')
GROUP BY pubname;

-- 17. Check for tables WITHOUT realtime enabled (might be intentional)
SELECT
    schemaname || '.' || tablename as full_table_name
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN ('offers', 'reservations', 'partners', 'users', 'user_points', 'partner_points')
  AND NOT EXISTS (
    SELECT 1 FROM pg_publication_tables pt
    WHERE pt.schemaname = t.schemaname
      AND pt.tablename = t.tablename
      AND pt.pubname = 'supabase_realtime'
  );

-- 18. Check active database connections by type
SELECT
    application_name,
    state,
    COUNT(*) as connection_count,
    MAX(state_change) as last_activity
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY application_name, state
ORDER BY connection_count DESC;
