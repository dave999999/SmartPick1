-- ============================================
-- DIAGNOSTIC SCRIPT FOR POINTS ISSUES
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. CHECK FOR DUPLICATE TRIGGERS
-- ============================================
SELECT
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  proname AS function_name,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
  END AS status
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid::regclass::text IN ('reservations', 'users')
  AND tgname NOT LIKE 'RI_%'  -- Exclude foreign key triggers
ORDER BY table_name, trigger_name;

-- EXPECTED OUTPUT (After migrations):
-- update_stats_on_pickup         | reservations | update_user_stats_on_pickup     | ENABLED
-- auto_generate_referral_code_trigger | users | auto_generate_referral_code | ENABLED
-- create_user_stats_trigger | users | init_user_stats | ENABLED

-- BAD if you see:
-- update_stats_on_reservation (should be DELETED)


-- 2. CHECK RECENT POINT TRANSACTIONS
-- ============================================
SELECT
  user_id,
  change,
  reason,
  balance_before,
  balance_after,
  metadata,
  created_at
FROM point_transactions
ORDER BY created_at DESC
LIMIT 20;

-- Look for:
-- - Multiple negative transactions for same reservation
-- - Transactions with change = -10 or -15 instead of -5


-- 3. CHECK IF USER HAS CORRECT BALANCE
-- ============================================
SELECT
  u.id,
  u.email,
  up.balance AS current_balance,
  (
    SELECT COALESCE(SUM(change), 0)
    FROM point_transactions pt
    WHERE pt.user_id = u.id
  ) + 100 AS calculated_balance  -- Start from 100 welcome bonus
FROM users u
LEFT JOIN user_points up ON up.user_id = u.id
WHERE u.role = 'CUSTOMER'
ORDER BY u.created_at DESC
LIMIT 10;

-- If current_balance != calculated_balance, there's a mismatch


-- 4. CHECK FOR FUNCTIONS THAT MIGHT DEDUCT POINTS
-- ============================================
SELECT
  proname AS function_name,
  prosrc AS function_code
FROM pg_proc
WHERE prosrc LIKE '%deduct%point%'
   OR prosrc LIKE '%add_user_points%'
ORDER BY proname;


-- 5. CHECK SPECIFIC RESERVATION POINT DEDUCTIONS
-- ============================================
-- Replace 'YOUR_USER_EMAIL' with actual user email
SELECT
  r.id AS reservation_id,
  r.quantity,
  r.status,
  r.created_at AS reservation_time,
  pt.change AS points_deducted,
  pt.reason,
  pt.balance_after,
  pt.created_at AS transaction_time
FROM reservations r
JOIN users u ON r.customer_id = u.id
LEFT JOIN point_transactions pt ON
  pt.user_id = u.id
  AND pt.reason = 'reservation'
  AND pt.created_at BETWEEN r.created_at - INTERVAL '5 seconds'
                        AND r.created_at + INTERVAL '5 seconds'
WHERE u.email = 'YOUR_USER_EMAIL'  -- REPLACE THIS
ORDER BY r.created_at DESC
LIMIT 10;

-- Expected: change = -5 for all reservations regardless of quantity
-- BUG: If change varies with quantity (e.g., -10, -15)


-- 6. CHECK CANCELLED RESERVATIONS (NO REFUND)
-- ============================================
SELECT
  r.id AS reservation_id,
  r.status,
  r.quantity,
  r.created_at AS reserved_at,
  r.updated_at AS cancelled_at,
  pt_deduct.change AS points_deducted,
  pt_refund.change AS points_refunded
FROM reservations r
JOIN users u ON r.customer_id = u.id
LEFT JOIN point_transactions pt_deduct ON
  pt_deduct.user_id = u.id
  AND pt_deduct.reason = 'reservation'
  AND pt_deduct.created_at BETWEEN r.created_at - INTERVAL '5 seconds'
                                AND r.created_at + INTERVAL '5 seconds'
LEFT JOIN point_transactions pt_refund ON
  pt_refund.user_id = u.id
  AND pt_refund.reason = 'refund'
  AND pt_refund.created_at BETWEEN r.updated_at - INTERVAL '5 seconds'
                                AND r.updated_at + INTERVAL '5 seconds'
WHERE r.status = 'CANCELLED'
  AND u.email = 'YOUR_USER_EMAIL'  -- REPLACE THIS
ORDER BY r.created_at DESC;

-- Expected: pt_refund should exist with positive change (+5)
-- BUG: If pt_refund is NULL, refund is missing


-- 7. TEST PURCHASE POINTS FUNCTION
-- ============================================
-- (DANGEROUS - Only run in test environment)
-- This will add 10 test points to check if function works

/*
SELECT add_user_points(
  (SELECT id FROM users WHERE email = 'YOUR_USER_EMAIL'),  -- REPLACE
  10,
  'test_purchase',
  '{"test": true}'::jsonb
);
*/

-- Then check:
-- SELECT * FROM point_transactions WHERE reason = 'test_purchase' ORDER BY created_at DESC LIMIT 1;


-- 8. SUMMARY QUERY - OVERALL SYSTEM HEALTH
-- ============================================
SELECT
  'Total Users' AS metric,
  COUNT(*) AS value
FROM users
WHERE role = 'CUSTOMER'

UNION ALL

SELECT
  'Users with Points',
  COUNT(*)
FROM user_points

UNION ALL

SELECT
  'Total Point Transactions',
  COUNT(*)
FROM point_transactions

UNION ALL

SELECT
  'Reservations (Total)',
  COUNT(*)
FROM reservations

UNION ALL

SELECT
  'Reservations (Active)',
  COUNT(*)
FROM reservations
WHERE status = 'ACTIVE'

UNION ALL

SELECT
  'Reservations (Cancelled)',
  COUNT(*)
FROM reservations
WHERE status = 'CANCELLED'

UNION ALL

SELECT
  'Refund Transactions',
  COUNT(*)
FROM point_transactions
WHERE reason = 'refund';

-- Expected: Refund Transactions should be > 0 if users have cancelled reservations
