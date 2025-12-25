-- ============================================
-- RESET RATE LIMITING
-- ============================================
-- Purpose: Clear rate limiting data to allow immediate reservations
-- User: batumashvili.davit@gmail.com
-- Created: 2025-12-26
-- Note: rate_limits table is used by rate-limit edge function
-- ============================================

-- Step 1: Check current rate limit records
SELECT 
  'CURRENT RATE LIMITS:' as status,
  key,
  action,
  identifier,
  ip_address,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM rate_limits
ORDER BY created_at DESC
LIMIT 20;

-- Step 2: Clear reservation rate limits specifically
DELETE FROM rate_limits
WHERE action = 'reservation'
   OR key LIKE '%reservation%';

-- Step 3: Clear ALL rate limits (recommended for testing)
-- This removes all rate limiting records for all users/IPs
TRUNCATE TABLE rate_limits;

-- Step 4: Verify all rate limits cleared
SELECT 
  'AFTER RESET:' as status,
  COUNT(*) as total_rate_limits_remaining
FROM rate_limits;

-- ============================================
-- RESULT
-- ============================================
-- Rate limits cleared ✅
-- You can now make reservations immediately! 🚀
-- ============================================
