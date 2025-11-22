-- ================================================
-- RESET RATE LIMITS FOR USER
-- ================================================
-- This script clears server-side rate limiting records
-- stored in the rate_limits table.
--
-- Use this when testing or when a user is blocked by rate limits.
-- ================================================

-- 1. Find the user ID first
SELECT id, email, name 
FROM users 
WHERE email = 'davit.batumashvili@gmail.com';

-- Expected output: Get the user ID from above query
-- Copy the UUID and replace 'USER_ID_HERE' below

-- 2. Check current rate limit records for this user
SELECT 
    identifier,
    action,
    created_at,
    COUNT(*) OVER (PARTITION BY action) as attempts_in_window
FROM rate_limits
WHERE identifier LIKE '%USER_ID_HERE%'
ORDER BY created_at DESC;

-- 3. Delete all rate limit records for this user (ALL ACTIONS)
DELETE FROM rate_limits
WHERE identifier LIKE '%USER_ID_HERE%';

-- 4. Or delete only reservation rate limits (SPECIFIC ACTION)
-- DELETE FROM rate_limits
-- WHERE identifier LIKE '%USER_ID_HERE%'
--   AND action = 'reservation';

-- 5. Verify deletion
SELECT 
    identifier,
    action,
    created_at
FROM rate_limits
WHERE identifier LIKE '%USER_ID_HERE%';
-- Should return no rows if successfully deleted

-- ================================================
-- QUICK RESET (If you know the exact identifier)
-- ================================================

-- Get user ID:
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM users WHERE email = 'davit.batumashvili@gmail.com';
    
    -- Delete all rate limits for this user
    DELETE FROM rate_limits WHERE identifier = 'user:' || v_user_id::text;
    
    -- Show result
    RAISE NOTICE 'Deleted rate limits for user: %', v_user_id;
    RAISE NOTICE 'Remaining records: %', (SELECT COUNT(*) FROM rate_limits WHERE identifier = 'user:' || v_user_id::text);
END $$;

-- ================================================
-- NUCLEAR OPTION: Clear ALL rate limits (Testing Only!)
-- ================================================
-- USE WITH CAUTION - This clears rate limits for ALL users
-- Only use this in development/testing environments

-- TRUNCATE TABLE rate_limits;

-- ================================================
-- VERIFY USER STATUS AFTER RESET
-- ================================================
SELECT 
    u.id,
    u.email,
    u.name,
    u.penalty_count,
    u.penalty_until,
    u.status,
    (SELECT COUNT(*) FROM rate_limits WHERE identifier = 'user:' || u.id::text) as rate_limit_records,
    (SELECT COUNT(*) FROM reservations WHERE customer_id = u.id AND status = 'ACTIVE') as active_reservations
FROM users u
WHERE email = 'davit.batumashvili@gmail.com';
