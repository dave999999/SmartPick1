-- =========================================================
-- DEBUG: Check Cooldown System After 4th Cancellation
-- =========================================================
-- Run this to see what's happening with your cooldown
-- =========================================================

DO $$ BEGIN RAISE NOTICE '=== CHECKING YOUR COOLDOWN STATUS ==='; END $$;

-- Replace this with YOUR actual user ID
-- Find it by running: SELECT id, email FROM auth.users LIMIT 5;
\set YOUR_USER_ID 'YOUR-USER-ID-HERE'

-- 1. Check cancellation tracking records
SELECT 
  id,
  user_id,
  cancelled_at,
  cooldown_until,
  reset_count,
  '✅ Cancellation Record' as status
FROM user_cancellation_tracking
WHERE user_id = :'YOUR_USER_ID'
ORDER BY cancelled_at DESC;

-- 2. Check if is_user_in_cooldown returns correct status
SELECT * FROM is_user_in_cooldown(:'YOUR_USER_ID');

-- 3. Check penalty records
SELECT 
  id,
  user_id,
  reason,
  offense_number,
  cooldown_until,
  lifted_at,
  created_at,
  '✅ Penalty Record' as status
FROM penalties
WHERE user_id = :'YOUR_USER_ID'
ORDER BY created_at DESC;

-- 4. Check active reservations
SELECT 
  id,
  user_id,
  status,
  created_at,
  '✅ Reservation' as status
FROM reservations
WHERE user_id = :'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;

-- ✅ WHAT TO LOOK FOR:
-- 1. cancellation_tracking: Should have 4-5 records
-- 2. is_user_in_cooldown: Should return in_cooldown=true if 5th cancellation
-- 3. penalties: Should have a record with cooldown_until in the future
-- 4. reservations: Check if any are stuck in 'reserved' status
