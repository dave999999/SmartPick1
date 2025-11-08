-- Test the function by manually setting the user context
-- Replace the UUIDs with your actual values

-- First, verify the data again:
SELECT 
  'Reservation ID: ' || r.id as info,
  'Partner ID: ' || r.partner_id,
  'Partner user_id: ' || p.user_id,
  'Status: ' || r.status
FROM reservations r
JOIN partners p ON r.partner_id = p.id
WHERE r.status = 'ACTIVE'
LIMIT 1;

-- The function should work when called from the browser because:
-- 1. Browser has user session with partner user_id: 0f069ba3-2c87-44fe-99a0-97ba74532a86
-- 2. Function will find partner_id: 0384c929-0af0-4124-a64a-85e63cba5f1a
-- 3. Reservation partner_id matches, status is ACTIVE
-- 4. Should succeed!

-- Since SQL Editor shows null, this is expected - SQL Editor uses service_role, not user auth.
-- The actual test MUST be done from the browser Partner Dashboard.
